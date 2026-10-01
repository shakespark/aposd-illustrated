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

    void put(const std::string& key, const std::string& value, const WriteOptions& wo);
    bool erase(const std::string& key, const WriteOptions& wo);

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
