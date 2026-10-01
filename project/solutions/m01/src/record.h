#pragma once

#include <cstdint>
#include <string>

namespace minikv {

enum class RecordType : uint8_t {
    Put = 1,
    Delete = 2,
};

// One entry of the log. For Delete records `value` is empty.
// How records are stored on disk is private to LogFile (log_file.cpp).
struct Record {
    RecordType type = RecordType::Put;
    std::string key;
    std::string value;
};

}  // namespace minikv
