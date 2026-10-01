#include "parse_int.h"

#include <cctype>
#include <cerrno>
#include <cstdlib>

namespace minikv {

bool parseInt64(const std::string& s, int64_t& out) {
    // strtoll alone accepts leading whitespace and stops at the first
    // non-digit, so both have to be ruled out here.
    if (s.empty() || std::isspace(static_cast<unsigned char>(s[0]))) return false;
    char* end = nullptr;
    errno = 0;
    long long v = std::strtoll(s.c_str(), &end, 10);
    if (*end != '\0' || errno == ERANGE) return false;
    out = v;
    return true;
}

}  // namespace minikv
