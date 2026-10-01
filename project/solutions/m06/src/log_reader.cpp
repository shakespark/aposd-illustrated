#include "log_reader.h"

#include <cerrno>
#include <cstring>
#include <fcntl.h>
#include <stdexcept>

#include "byte_buffer.h"
#include "record.h"

namespace minikv {

namespace {
// Anything larger than this is treated as a damaged length field.
constexpr uint32_t kMaxFieldSize = 64u << 20;
}

bool LogReader::open(const std::string& path) {
    offset_ = 0;
    return file_.open(path, O_RDONLY, 0);
}

bool LogReader::next(std::string& out) {
    char header[kRecordHeaderSize];
    size_t got = readFully(header, sizeof header);
    if (got == 0) return false;
    if (got < sizeof header) {
        throw TruncatedRecord("truncated record header at offset " + std::to_string(offset_));
    }

    // Skip checksum (4) and type (1) to get to the two lengths.
    ByteReader r(header, sizeof header);
    r.skip(5);
    uint32_t keyLen = r.getU32();
    uint32_t valueLen = r.getU32();
    if (keyLen > kMaxFieldSize || valueLen > kMaxFieldSize) {
        throw std::runtime_error("bad record length at offset " + std::to_string(offset_));
    }

    size_t bodyLen = size_t(keyLen) + valueLen;
    out.assign(header, sizeof header);
    out.resize(sizeof header + bodyLen);
    got = readFully(&out[sizeof header], bodyLen);
    if (got < bodyLen) {
        throw TruncatedRecord("truncated record at offset " + std::to_string(offset_));
    }
    offset_ += out.size();
    return true;
}

size_t LogReader::readFully(char* buf, size_t n) {
    size_t done = 0;
    while (done < n) {
        ssize_t r = file_.read(buf + done, n - done);
        if (r < 0) {
            if (errno == EINTR) continue;
            throw std::runtime_error(std::string("log read failed: ") + std::strerror(errno));
        }
        if (r == 0) break;
        done += static_cast<size_t>(r);
    }
    return done;
}

}  // namespace minikv
