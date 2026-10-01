#include "log_file.h"

#include <cerrno>
#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <stdexcept>
#include <unistd.h>

#include "crc32.h"

namespace minikv {

// On-disk layout of a record (all integers little-endian):
//
//   offset 0   uint32  crc32 of everything after this field
//   offset 4   uint8   type
//   offset 5   uint32  key length
//   offset 9   uint32  value length
//   offset 13  key bytes, then value bytes
//
// This file is the only place that knows the layout.
namespace {

constexpr size_t kHeaderSize = 13;
constexpr size_t kTypeOffset = 4;
constexpr size_t kKeyLenOffset = 5;
constexpr size_t kValueLenOffset = 9;

// Anything larger than this is treated as a damaged length field.
constexpr uint32_t kMaxFieldSize = 64u << 20;

void putU32(char* p, uint32_t v) {
    for (int i = 0; i < 4; i++) p[i] = static_cast<char>((v >> (8 * i)) & 0xFF);
}

uint32_t getU32(const char* p) {
    uint32_t v = 0;
    for (int i = 0; i < 4; i++) v |= static_cast<uint32_t>(static_cast<unsigned char>(p[i])) << (8 * i);
    return v;
}

std::string encode(const Record& rec) {
    std::string buf(kHeaderSize, '\0');
    buf[kTypeOffset] = static_cast<char>(rec.type);
    putU32(&buf[kKeyLenOffset], static_cast<uint32_t>(rec.key.size()));
    putU32(&buf[kValueLenOffset], static_cast<uint32_t>(rec.value.size()));
    buf += rec.key;
    buf += rec.value;
    putU32(&buf[0], crc32(buf.data() + 4, buf.size() - 4));
    return buf;
}

[[noreturn]] void ioError(const std::string& what, const std::string& path) {
    throw std::runtime_error(what + " " + path + ": " + std::strerror(errno));
}

void writeAll(int fd, const std::string& data, const std::string& path) {
    const char* p = data.data();
    size_t left = data.size();
    while (left > 0) {
        ssize_t n = ::write(fd, p, left);
        if (n < 0) {
            if (errno == EINTR) continue;
            ioError("cannot write", path);
        }
        p += n;
        left -= static_cast<size_t>(n);
    }
}

// Reads up to n bytes; returns fewer only at end of file.
size_t readFully(int fd, char* buf, size_t n, const std::string& path) {
    size_t done = 0;
    while (done < n) {
        ssize_t r = ::read(fd, buf + done, n - done);
        if (r < 0) {
            if (errno == EINTR) continue;
            ioError("cannot read", path);
        }
        if (r == 0) break;
        done += static_cast<size_t>(r);
    }
    return done;
}

// Reads every record of the file open on `fd`, passing each to `visit`.
// Returns the offset just past the last record.
uint64_t replay(int fd, const std::string& path, const LogFile::RecordVisitor& visit) {
    uint64_t offset = 0;
    std::string buf;
    while (true) {
        auto damaged = [&](const std::string& why) {
            return std::runtime_error(path + ": bad record at offset " + std::to_string(offset) + ": " + why);
        };
        buf.resize(kHeaderSize);
        size_t got = readFully(fd, &buf[0], kHeaderSize, path);
        if (got == 0) return offset;
        if (got < kHeaderSize) throw damaged("truncated header");

        uint8_t type = static_cast<uint8_t>(buf[kTypeOffset]);
        uint32_t keyLen = getU32(&buf[kKeyLenOffset]);
        uint32_t valueLen = getU32(&buf[kValueLenOffset]);
        if (keyLen > kMaxFieldSize || valueLen > kMaxFieldSize) throw damaged("implausible length");

        size_t bodyLen = size_t(keyLen) + valueLen;
        buf.resize(kHeaderSize + bodyLen);
        if (readFully(fd, &buf[kHeaderSize], bodyLen, path) < bodyLen) throw damaged("truncated record");
        if (crc32(buf.data() + 4, buf.size() - 4) != getU32(&buf[0])) throw damaged("checksum mismatch");
        if (type != static_cast<uint8_t>(RecordType::Put) && type != static_cast<uint8_t>(RecordType::Delete)) {
            throw damaged("unknown record type " + std::to_string(type));
        }

        Record rec;
        rec.type = static_cast<RecordType>(type);
        rec.key = buf.substr(kHeaderSize, keyLen);
        rec.value = buf.substr(kHeaderSize + keyLen, valueLen);
        visit(rec, buf.size());
        offset += buf.size();
    }
}

}  // namespace

LogFile::LogFile(const std::string& path, const RecordVisitor& visit) : path_(path) {
    int readFd = ::open(path.c_str(), O_RDONLY);
    if (readFd >= 0) {
        try {
            size_ = replay(readFd, path, visit);
        } catch (...) {
            ::close(readFd);
            throw;
        }
        ::close(readFd);
    } else if (errno != ENOENT) {
        ioError("cannot open", path);
    }

    fd_ = ::open(path.c_str(), O_WRONLY | O_CREAT | O_APPEND, 0644);
    if (fd_ < 0) ioError("cannot open", path);
}

LogFile::~LogFile() {
    if (fd_ >= 0) ::close(fd_);
}

uint64_t LogFile::append(const Record& rec, const WriteOptions& options) {
    std::string buf = encode(rec);
    writeAll(fd_, buf, path_);
    if (options.sync && ::fsync(fd_) != 0) ioError("cannot fsync", path_);
    size_ += buf.size();
    return buf.size();
}

void LogFile::rewrite(const std::function<void(const RecordSink&)>& writeRecords) {
    std::string tmp = path_ + ".compact";
    int out = ::open(tmp.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (out < 0) ioError("cannot create", tmp);

    uint64_t newSize = 0;
    try {
        writeRecords([&](const Record& rec) {
            std::string buf = encode(rec);
            writeAll(out, buf, tmp);
            newSize += buf.size();
        });
        if (::fsync(out) != 0) ioError("cannot fsync", tmp);
        if (std::rename(tmp.c_str(), path_.c_str()) != 0) ioError("cannot rename", tmp);
    } catch (...) {
        ::close(out);
        ::unlink(tmp.c_str());
        throw;
    }
    ::close(out);

    // The old descriptor still points at the replaced file; switch to the new one.
    int fd = ::open(path_.c_str(), O_WRONLY | O_APPEND);
    if (fd < 0) ioError("cannot reopen", path_);
    ::close(fd_);
    fd_ = fd;
    size_ = newSize;
}

}  // namespace minikv
