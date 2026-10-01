#include "crc32.h"

#include <array>

namespace minikv {

namespace {

std::array<uint32_t, 256> makeTable() {
    std::array<uint32_t, 256> table{};
    for (uint32_t i = 0; i < 256; i++) {
        uint32_t c = i;
        for (int k = 0; k < 8; k++) {
            c = (c & 1) ? 0xEDB88320u ^ (c >> 1) : c >> 1;
        }
        table[i] = c;
    }
    return table;
}

}  // namespace

uint32_t crc32(const char* data, size_t n) {
    static const std::array<uint32_t, 256> table = makeTable();
    uint32_t c = 0xFFFFFFFFu;
    for (size_t i = 0; i < n; i++) {
        c = table[(c ^ static_cast<unsigned char>(data[i])) & 0xFF] ^ (c >> 8);
    }
    return c ^ 0xFFFFFFFFu;
}

}  // namespace minikv
