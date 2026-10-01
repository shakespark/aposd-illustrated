#pragma once

#include <cstdint>
#include <string>

namespace minikv {

// Parses `s` as a base-10 signed 64-bit integer with an optional leading
// '+' or '-'. The whole string must be the number: "", " 5", "12abc" and
// values outside the range of int64_t are all rejected. Returns false on
// rejection and then leaves `out` unchanged.
bool parseInt64(const std::string& s, int64_t& out);

}  // namespace minikv
