#pragma once

#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#include "index.h"
#include "log_writer.h"
#include "options.h"
#include "record.h"
#include "stats.h"

namespace minikv {

// Thrown by operations that need an existing key when the key is absent.
class KeyNotFound : public std::runtime_error {
public:
    explicit KeyNotFound(const std::string& key) : std::runtime_error("no such key: " + key) {}
};

// A durable map from string keys to string values. All keys and values live
// in memory; every change is also appended to a log file before the method
// that made it returns, and the log is replayed by the constructor, so the
// data survives restarts. The log keeps growing as keys are overwritten or
// deleted; compact() shrinks it.
//
// Errors: every method that changes data throws std::runtime_error if the
// log cannot be written. The in-memory data is then unchanged, but the log
// may end with a partial record. A Store is not thread-safe.
class Store {
public:
    // Opens the log at `path`, creating an empty one if it does not exist,
    // and loads its contents. Throws std::runtime_error if the file cannot be
    // opened or any record in it is damaged (including an incomplete last
    // record left by a crash).
    Store(const std::string& path, const Options& options);

    // Returns {true, value} if `key` is present and {false, ""} otherwise.
    // Counts one keyspace hit or miss in stats().
    std::pair<bool, std::string> get(const std::string& key) const;

    // Returns whether `key` is present. Like get(), counts one keyspace hit
    // or miss in stats().
    bool exists(const std::string& key) const;

    // All keys that start with `prefix` ("" matches every key), sorted.
    std::vector<std::string> keys(const std::string& prefix) const;

    // Sets the value of `key`, replacing any previous value.
    void set(const std::string& key, const std::string& value, const WriteOptions& wo);

    // Removes `key`. Throws KeyNotFound if it is absent.
    void del(const std::string& key, const WriteOptions& wo);

    // Treats the value of `key` as a signed 64-bit decimal integer, adds
    // `delta` and returns the result; an absent key counts as 0. Throws
    // std::invalid_argument if the value is not such an integer and
    // std::overflow_error if the result does not fit; the value is then
    // unchanged.
    int64_t incr(const std::string& key, int64_t delta, const WriteOptions& wo);

    // Appends `suffix` to the value of `key` (an absent key counts as "")
    // and returns the length of the new value in bytes.
    size_t append(const std::string& key, const std::string& suffix, const WriteOptions& wo);

    // Returns bytes start..end of the value of `key`, both ends inclusive,
    // counting from 0. Throws KeyNotFound if `key` is absent and
    // std::out_of_range unless 0 <= start <= end < length of the value.
    std::string getRange(const std::string& key, int64_t start, int64_t end) const;

    // Gives the value of `from` to `to` and removes `from`, as if by
    // set(to, value) followed by del(from). An existing value of `to` is
    // replaced. Renaming a key to itself does nothing. Throws KeyNotFound if
    // `from` is absent; nothing changes then.
    // Not atomic across crashes: the change is logged as two records, so a
    // crash between them leaves both keys holding the value after a restart
    // (never neither).
    void rename(const std::string& from, const std::string& to, const WriteOptions& wo);

    // Rewrites the log so that it holds only the current value of each key,
    // which brings garbageBytes() to 0. Takes time proportional to the size
    // of the live data. If the process dies during compaction, the old log
    // is still complete. Throws std::runtime_error on I/O errors; the log on
    // disk then still holds all the data, but if the failure happened while
    // switching to the new file, every later write fails too until the Store
    // is reopened.
    void compact();

    size_t keyCount() const { return index_.size(); }

    // Current size of the log file in bytes.
    uint64_t logBytes() const { return logBytes_; }

    // Bytes of the log that compaction would remove: records that have been
    // overwritten or deleted since, plus the delete records themselves.
    uint64_t garbageBytes() const { return garbageBytes_; }

    const Stats& stats() const { return stats_; }

private:
    void load();
    void replayRecord(const Record& r);

    std::string path_;
    Index index_;
    LogWriter writer_;
    uint64_t logBytes_ = 0;
    uint64_t garbageBytes_ = 0;
    // Counters for STATS. Mutable because lookups count hits and misses.
    mutable Stats stats_;
};

}  // namespace minikv
