#pragma once

#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>

#include "file_handle.h"

namespace minikv {

// The file ends in the middle of a record: what a crash during a write
// leaves behind.
class TruncatedRecord : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

// Reads raw records one after another from a log file. Use RecordParser to
// turn the bytes into a Record.
class LogReader {
public:
    // Opens `path` for reading. Returns false on failure; errno is left set.
    bool open(const std::string& path);

    // Reads the next record (header, key and value bytes) into `out`.
    // Returns false at a clean end of file. Throws TruncatedRecord if the
    // file ends in the middle of a record, std::runtime_error if a length
    // field is implausible or reading fails.
    bool next(std::string& out);

    // Offset of the record that the next call to next() will read.
    uint64_t offset() const { return offset_; }

private:
    size_t readFully(char* buf, size_t n);

    FileHandle file_;
    uint64_t offset_ = 0;
};

}  // namespace minikv
