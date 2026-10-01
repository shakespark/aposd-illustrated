#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <utility>
#include <vector>

#include "options.h"
#include "store.h"

namespace minikv {

// Database is the entry point of the library: it owns the Store and decides
// when the log should be compacted.
class Database {
public:
    Database(const std::string& path, const Options& options);

    std::pair<bool, std::string> get(const std::string& key) const;
    bool exists(const std::string& key) const;
    std::vector<std::string> keys(const std::string& prefix) const;
    std::string getRange(const std::string& key, int64_t start, int64_t end) const;

    void set(const std::string& key, const std::string& value, const WriteOptions& wo);
    bool del(const std::string& key, const WriteOptions& wo);
    int64_t incr(const std::string& key, int64_t delta, const WriteOptions& wo);
    size_t append(const std::string& key, const std::string& suffix, const WriteOptions& wo);

    void compact();

    // One line of "name=value" pairs for the STATS command.
    std::string stats() const;

private:
    // Called after every write; runs compaction if the options say so.
    void maybeCompact();

    Options options_;
    Store store_;
    uint32_t writesSinceCheck_ = 0;
};

}  // namespace minikv
