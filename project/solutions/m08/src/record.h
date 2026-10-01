#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

namespace minikv {

enum class RecordType : uint8_t {
    Put = 1,
    Delete = 2,
};

// One entry of the log. For Delete records `value` is empty.
struct Record {
    RecordType type = RecordType::Put;
    std::string key;
    std::string value;
};

// On-disk layout of a record (all integers little-endian):
//
//   offset 0   uint32  crc32 of everything after this field
//   offset 4   uint8   type
//   offset 5   uint32  key length
//   offset 9   uint32  value length
//   offset 13  key bytes, then value bytes
constexpr size_t kRecordHeaderSize = 13;

}  // namespace minikv
