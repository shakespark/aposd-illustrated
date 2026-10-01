#include "database.h"


namespace minikv {

namespace {

// Below this much garbage a rewrite is not worth its file creation, rename
// and fsync, whatever the proportions: reclaiming less than 1 MiB of disk
// saves nothing anyone will notice.
constexpr uint64_t kMinGarbageToCompact = 1 << 20;

}  // namespace

Database::Database(const std::string& path) : store_(path) {}

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

// Compaction rewrites only the live data, so it costs about `live` bytes of
// I/O and reclaims `garbage` bytes. Waiting until garbage >= live means every
// byte compaction writes pays for at least one byte of garbage removed: total
// disk writes stay within 2x of what the commands wrote, and the log stays
// within about 2x the size of the live data. The check is two comparisons,
// so it runs after every write.
void Database::maybeCompact() {
    uint64_t garbage = store_.dead();
    uint64_t live = store_.total() - garbage;
    if (garbage >= kMinGarbageToCompact && garbage >= live) store_.compact();
}

}  // namespace minikv
