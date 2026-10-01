#pragma once

#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#include "index.h"
#include "log_file.h"
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
class Store {
public:
    Store(const std::string& path, const Options& options);

    std::pair<bool, std::string> get(const std::string& key) const;
    bool exists(const std::string& key) const;
    std::vector<std::string> keys(const std::string& prefix) const;

    void set(const std::string& key, const std::string& value, const WriteOptions& wo);
    void del(const std::string& key, const WriteOptions& wo);
    int64_t incr(const std::string& key, int64_t delta, const WriteOptions& wo);
    size_t append(const std::string& key, const std::string& suffix, const WriteOptions& wo);
    std::string getRange(const std::string& key, int64_t start, int64_t end) const;

    // Loops over index_ and passes each entry to log_.rewrite(), then sets
    // total_ to log_.size() and dead_ to 0.
    void compact();

    size_t count() const { return index_.size(); }
    uint64_t total() const { return total_; }
    uint64_t dead() const { return dead_; }
    const Stats& stats() const { return stats_; }

private:
    void handle(const Record& r, uint64_t size);

    Index index_;
    uint64_t total_ = 0;   // total
    uint64_t dead_ = 0;    // dead bytes
    mutable Stats stats_;  // stats
    LogFile log_;          // last: replaying it fills the members above
};

}  // namespace minikv
