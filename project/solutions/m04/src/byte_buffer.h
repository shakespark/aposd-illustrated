#pragma once

#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>

namespace minikv {

// Builds a little-endian byte string.
class ByteWriter {
public:
    void putU8(uint8_t v) { buf_.push_back(static_cast<char>(v)); }

    void putU32(uint32_t v) {
        for (int i = 0; i < 4; i++) {
            buf_.push_back(static_cast<char>((v >> (8 * i)) & 0xFF));
        }
    }

    void putBytes(const std::string& s) { buf_.append(s); }

    std::string& data() { return buf_; }
    size_t size() const { return buf_.size(); }

private:
    std::string buf_;
};

// Reads little-endian values from a byte range it does not own.
class ByteReader {
public:
    ByteReader(const char* data, size_t size) : p_(data), end_(data + size) {}

    uint8_t getU8() {
        need(1);
        return static_cast<uint8_t>(*p_++);
    }

    uint32_t getU32() {
        need(4);
        uint32_t v = 0;
        for (int i = 0; i < 4; i++) {
            v |= static_cast<uint32_t>(static_cast<unsigned char>(*p_++)) << (8 * i);
        }
        return v;
    }

    std::string getBytes(size_t n) {
        need(n);
        std::string s(p_, n);
        p_ += n;
        return s;
    }

    void skip(size_t n) {
        need(n);
        p_ += n;
    }

    size_t remaining() const { return static_cast<size_t>(end_ - p_); }

private:
    void need(size_t n) const {
        if (remaining() < n) throw std::runtime_error("ByteReader: read past end");
    }

    const char* p_;
    const char* end_;
};

}  // namespace minikv
