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

std::string Database::getRange(const std::string& key, int64_t start, int64_t end) const {
    return store_.getRange(key, start, end);
}

void Database::set(const std::string& key, const std::string& value, const WriteOptions& wo) {
    store_.set(key, value, wo);
    maybeCompact();
}

void Database::del(const std::string& key, const WriteOptions& wo) {
    store_.del(key, wo);
    maybeCompact();
}

int64_t Database::incr(const std::string& key, int64_t delta, const WriteOptions& wo) {
    int64_t v = store_.incr(key, delta, wo);
    maybeCompact();
    return v;
}

size_t Database::append(const std::string& key, const std::string& suffix, const WriteOptions& wo) {
    size_t n = store_.append(key, suffix, wo);
    maybeCompact();
    return n;
}

void Database::rename(const std::string& from, const std::string& to, const WriteOptions& wo) {
    store_.rename(from, to, wo);
    maybeCompact();
}

void Database::compact() {
    store_.compact();
}

std::string Database::stats() const {
    std::string out = "keys=" + std::to_string(store_.keyCount()) +
                      " log_bytes=" + std::to_string(store_.logBytes()) +
                      " garbage_bytes=" + std::to_string(store_.garbageBytes());
    std::string counters = store_.stats().format();
    if (!counters.empty()) out += " " + counters;
    return out;
}

void Database::maybeCompact() {
    if (++writesSinceCheck_ < options_.compaction_check_interval) return;
    writesSinceCheck_ = 0;
    uint64_t garbage = store_.garbageBytes();
    if (garbage < options_.compaction_min_bytes) return;
    if (static_cast<double>(garbage) < options_.compaction_ratio * static_cast<double>(store_.logBytes())) return;
    store_.compact();
}

}  // namespace minikv
