#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <utility>
#include <vector>

#include "index.h"
#include "log_writer.h"
#include "options.h"
#include "record.h"
#include "stats.h"

namespace minikv {

// Store keeps every key in memory and records every change in an
// append-only log, which is replayed when the Store is constructed.
class Store {
public:
    Store(const std::string& path, const Options& options);

    std::pair<bool, std::string> get(const std::string& key) const;
    bool exists(const std::string& key) const;
    std::vector<std::string> keys(const std::string& prefix) const;

    // Makes `value` the value of `key`, replacing any previous value.
    void put(const std::string& key, const std::string& value, const WriteOptions& wo);

    // Makes sure `key` has no value. Returns true if it had one (and a
    // delete was logged), false if there was nothing to remove.
    bool erase(const std::string& key, const WriteOptions& wo);

    // Loops over index_ and writes each entry with a second LogWriter opened
    // with O_TRUNC on path_ + ".compact", fsyncs it, closes writer_,
    // rename(2)s the new file over path_, reopens writer_ with O_APPEND,
    // then sets total_ to the new size and dead_ to 0.
    void compact();

    size_t count() const { return index_.size(); }
    uint64_t total() const { return total_; }
    uint64_t dead() const { return dead_; }
    const Stats& stats() const { return stats_; }

private:
    void load();
    // Applies `r` to the in-memory state (index and byte counts) and
    // returns the number of bytes the record takes in the log.
    uint64_t handle(const Record& r);

    std::string path_;
    Index index_;
    LogWriter writer_;
    uint64_t total_ = 0;   // total
    uint64_t dead_ = 0;    // dead bytes
    mutable Stats stats_;  // stats
};

}  // namespace minikv
