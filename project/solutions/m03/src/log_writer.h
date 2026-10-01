#pragma once

#include <cstdint>
#include <string>
#include <sys/types.h>

#include "file_handle.h"
#include "options.h"
#include "record.h"

namespace minikv {

// Appends records to a log file in the format described in record.h.
class LogWriter {
public:
    // Opens `path` for writing. `flags` and `mode` are passed to open(2) as
    // they are. `startOffset` must be the current size of the file, so that
    // the offsets returned by append() are correct.
    bool open(const std::string& path, int flags, mode_t mode, uint64_t startOffset);

    // Encodes `rec`, writes it, and returns the offset where it starts.
    // Throws std::runtime_error if the write fails.
    uint64_t append(const Record& rec, const WriteOptions& options);

    // Offset just past the last record written.
    uint64_t offset() const { return offset_; }

    bool sync();
    void close();

private:
    FileHandle file_;
    uint64_t offset_ = 0;
};

}  // namespace minikv
