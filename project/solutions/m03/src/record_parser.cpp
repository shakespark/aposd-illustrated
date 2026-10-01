#include "record_parser.h"

#include <stdexcept>

#include "byte_buffer.h"
#include "crc32.h"

namespace minikv {

Record RecordParser::parse(const std::string& raw) {
    ByteReader r(raw.data(), raw.size());
    uint32_t storedCrc = r.getU32();
    uint8_t type = r.getU8();
    uint32_t keyLen = r.getU32();
    uint32_t valueLen = r.getU32();
    if (r.remaining() != size_t(keyLen) + valueLen) {
        throw std::runtime_error("record length mismatch");
    }
    if (crc32(raw.data() + 4, raw.size() - 4) != storedCrc) {
        throw std::runtime_error("checksum mismatch");
    }
    if (type != static_cast<uint8_t>(RecordType::Put) && type != static_cast<uint8_t>(RecordType::Delete)) {
        throw std::runtime_error("unknown record type " + std::to_string(type));
    }

    Record rec;
    rec.type = static_cast<RecordType>(type);
    rec.key = r.getBytes(keyLen);
    rec.value = r.getBytes(valueLen);
    return rec;
}

}  // namespace minikv
