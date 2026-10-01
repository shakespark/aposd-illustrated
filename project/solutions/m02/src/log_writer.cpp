#include "log_writer.h"

#include <cerrno>
#include <cstring>
#include <stdexcept>

#include "byte_buffer.h"
#include "crc32.h"

namespace minikv {

bool LogWriter::open(const std::string& path, int flags, mode_t mode, uint64_t startOffset) {
    if (!file_.open(path, flags, mode)) return false;
    offset_ = startOffset;
    return true;
}

uint64_t LogWriter::append(const Record& rec, const WriteOptions& options) {
    ByteWriter w;
    w.putU32(0);  // checksum, filled in below
    w.putU8(static_cast<uint8_t>(rec.type));
    w.putU32(static_cast<uint32_t>(rec.key.size()));
    w.putU32(static_cast<uint32_t>(rec.value.size()));
    w.putBytes(rec.key);
    w.putBytes(rec.value);

    std::string& buf = w.data();
    uint32_t crc = crc32(buf.data() + 4, buf.size() - 4);
    for (int i = 0; i < 4; i++) {
        buf[i] = static_cast<char>((crc >> (8 * i)) & 0xFF);
    }

    const char* p = buf.data();
    size_t left = buf.size();
    while (left > 0) {
        ssize_t n = file_.write(p, left);
        if (n < 0) {
            if (errno == EINTR) continue;
            throw std::runtime_error(std::string("log write failed: ") + std::strerror(errno));
        }
        p += n;
        left -= static_cast<size_t>(n);
    }
    if (options.sync && !file_.sync()) {
        throw std::runtime_error(std::string("fsync failed: ") + std::strerror(errno));
    }

    uint64_t start = offset_;
    offset_ += buf.size();
    return start;
}

bool LogWriter::sync() {
    return file_.sync();
}

void LogWriter::close() {
    file_.close();
}

}  // namespace minikv
