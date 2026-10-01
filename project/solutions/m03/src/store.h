#pragma once

#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "log_writer.h"
#include "options.h"
#include "record.h"
#include "stats.h"

namespace minikv {

class KeyNotFound : public std::runtime_error {
public:
    explicit KeyNotFound(const std::string& key) : std::runtime_error("no such key: " + key) {}
};

// Store keeps every key in memory and records every change in an
// append-only log, which is replayed when the Store is constructed.
// It also decides when the log has enough garbage to be compacted.
class Store {
public:
    // `options` are fixed for the lifetime of the Store; throws
    // std::invalid_argument if they are invalid.
    Store(const std::string& path, const Options& options);

    std::pair<bool, std::string> get(const std::string& key) const;
    bool exists(const std::string& key) const;
    std::vector<std::string> keys(const std::string& prefix) const;

    void set(const std::string& key, const std::string& value);
    void del(const std::string& key);
    int64_t incr(const std::string& key, int64_t delta);
    size_t append(const std::string& key, const std::string& suffix);
    std::string getRange(const std::string& key, int64_t start, int64_t end) const;

    // Loops over index_ and writes each entry with a second LogWriter opened
    // with O_TRUNC on path_ + ".compact", fsyncs it, closes writer_,
    // rename(2)s the new file over path_, reopens writer_ with O_APPEND,
    // then sets total_ to the new size and dead_ to 0.
    void compact();

    // One line of "name=value" pairs for the STATS command.
    std::string stats() const;

private:
    struct Entry {
        std::string value;
        uint64_t recordSize = 0;  // size of the record in the log
    };

    void load();
    void handle(const Record& r);
    const Entry* lookup(const std::string& key) const;
    // Called after every write; runs compaction if the options say so.
    void maybeCompact();

    Options options_;
    WriteOptions writeOptions_;  // derived from options_.sync_writes
    std::string path_;
    std::unordered_map<std::string, Entry> index_;
    LogWriter writer_;
    uint64_t total_ = 0;   // total
    uint64_t dead_ = 0;    // dead bytes
    mutable Stats stats_;  // stats
    uint32_t writesSinceCheck_ = 0;
};

}  // namespace minikv
