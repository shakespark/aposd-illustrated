#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

#include "file_handle.h"

namespace minikv {

// Reads raw records one after another from a log file. Use RecordParser to
// turn the bytes into a Record.
class LogReader {
public:
    // Opens `path` for reading. Returns false on failure; errno is left set.
    bool open(const std::string& path);

    // Reads the next record (header, key and value bytes) into `out`.
    // Returns false at a clean end of file. Throws std::runtime_error if the
    // file ends in the middle of a record or a length field is implausible.
    bool next(std::string& out);

    // Offset of the record that the next call to next() will read.
    uint64_t offset() const { return offset_; }

private:
    size_t readFully(char* buf, size_t n);

    FileHandle file_;
    uint64_t offset_ = 0;
};

}  // namespace minikv
