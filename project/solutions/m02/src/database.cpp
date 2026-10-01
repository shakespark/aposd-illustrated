#include "database.h"

#include <stdexcept>

namespace minikv {

namespace {
const Options& checked(const Options& options) {
    std::string err = options.validate();
    if (!err.empty()) throw std::invalid_argument("invalid options: " + err);
    return options;
}
}  // namespace

Database::Database(const std::string& path, const Options& options)
    : options_(checked(options)), store_(path, options_) {}

std::pair<bool, std::string> Database::get(const std::string& key) const {
    return store_.get(key);
}

bool Database::exists(const std::string& key) const {
    return store_.exists(key);
}

std::vector<std::string> Database::keys(const std::string& prefix) const {
    return store_.keys(prefix);
}

void Database::put(const std::string& key, const std::string& value, const WriteOptions& wo) {
    store_.put(key, value, wo);
    maybeCompact();
}

bool Database::erase(const std::string& key, const WriteOptions& wo) {
    bool erased = store_.erase(key, wo);
    if (erased) maybeCompact();
    return erased;
}

void Database::compact() {
    store_.compact();
}

std::string Database::stats() const {
    std::string out = "keys=" + std::to_string(store_.count()) +
                      " log_bytes=" + std::to_string(store_.total()) +
                      " garbage_bytes=" + std::to_string(store_.dead());
    std::string counters = store_.stats().format();
    if (!counters.empty()) out += " " + counters;
    return out;
}

void Database::maybeCompact() {
    if (++writesSinceCheck_ < options_.compaction_check_interval) return;
    writesSinceCheck_ = 0;
    uint64_t garbage = store_.dead();
    if (garbage < options_.compaction_min_bytes) return;
    if (static_cast<double>(garbage) < options_.compaction_ratio * static_cast<double>(store_.total())) return;
    store_.compact();
}

}  // namespace minikv
