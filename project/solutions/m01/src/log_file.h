#pragma once

#include <cstdint>
#include <functional>
#include <string>

#include "options.h"
#include "record.h"

namespace minikv {

// An append-only file of Records that survives restarts. LogFile owns
// everything about the file: how records are encoded and checksummed, how
// partial reads and writes are retried, and how the file is replaced during
// compaction. Callers only see Records and their sizes in bytes.
class LogFile {
public:
    // Receives each record found in the log and the number of bytes it
    // occupies there.
    using RecordVisitor = std::function<void(const Record&, uint64_t size)>;
    // Accepts one record to be written into a rewritten log.
    using RecordSink = std::function<void(const Record&)>;

    // Opens the log at `path`, creating an empty one if it does not exist,
    // and passes every record already in it to `visit`, oldest first. When
    // the constructor returns, the log is ready for append().
    // Throws std::runtime_error if the file cannot be opened or a record in
    // it is damaged (the message names the file and the offset).
    LogFile(const std::string& path, const RecordVisitor& visit);
    ~LogFile();
    LogFile(const LogFile&) = delete;
    LogFile& operator=(const LogFile&) = delete;

    // Appends `rec` to the log and returns the number of bytes it occupies.
    // Throws std::runtime_error if the write fails.
    uint64_t append(const Record& rec, const WriteOptions& options);

    // Replaces the contents of the log with the records that `writeRecords`
    // passes to the sink it is given. The replacement is atomic: if the
    // process dies midway, the log still holds its old contents.
    // Throws std::runtime_error on I/O errors; the old log is then kept.
    void rewrite(const std::function<void(const RecordSink&)>& writeRecords);

    // Current size of the log in bytes.
    uint64_t size() const { return size_; }

private:
    std::string path_;
    int fd_ = -1;
    uint64_t size_ = 0;
};

}  // namespace minikv
