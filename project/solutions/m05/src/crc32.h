#pragma once

#include <cstddef>
#include <cstdint>

namespace minikv {

// Standard CRC-32 (the one used by zlib and Ethernet) of `n` bytes at `data`.
uint32_t crc32(const char* data, size_t n);

}  // namespace minikv
