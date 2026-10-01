#pragma once

#include <string>

#include "record.h"

namespace minikv {

// Decodes the bytes returned by LogReader::next().
class RecordParser {
public:
    // Throws std::runtime_error if the checksum does not match or the
    // lengths in the header disagree with the size of `raw`.
    static Record parse(const std::string& raw);
};

}  // namespace minikv
