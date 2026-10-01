#include "store.h"

#include <cerrno>
#include <cstdlib>
#include <limits>

namespace minikv {

Store::Store(const std::string& path, const Options& options)
    : index_(options.index_reserve),
      log_(path, [this](const Record& r, uint64_t size) { handle(r, size); }) {}

void Store::handle(const Record& r, uint64_t size) {
    total_ += size;
    const IndexEntry* old = index_.find(r.key);
    if (old) dead_ += old->recordSize;
    if (r.type == RecordType::Put) {
        index_.put(r.key, r.value, size);
    } else {
        dead_ += size;
        index_.erase(r.key);
    }
}

std::pair<bool, std::string> Store::get(const std::string& key) const {
    std::optional<std::string> v = index_.get(key);
    stats_.add(v ? "keyspace_hits" : "keyspace_misses");
    if (!v) return {false, ""};
    return {true, *v};
}

bool Store::exists(const std::string& key) const {
    bool found = index_.contains(key);
    stats_.add(found ? "keyspace_hits" : "keyspace_misses");
    return found;
}

std::vector<std::string> Store::keys(const std::string& prefix) const {
    return index_.keysWithPrefix(prefix);
}

void Store::set(const std::string& key, const std::string& value, const WriteOptions& wo) {
    Record rec;
    rec.type = RecordType::Put;
    rec.key = key;
    rec.value = value;
    // write the record
    uint64_t size = log_.append(rec, wo);

    // update dead
    const IndexEntry* old = index_.find(key);
    if (old) dead_ += old->recordSize;
    // update total
    total_ += size;
    // update index
    index_.put(key, value, size);
    stats_.add("bytes_written", size);
}

void Store::del(const std::string& key, const WriteOptions& wo) {
    const IndexEntry* old = index_.find(key);
    if (!old) throw KeyNotFound(key);

    Record rec;
    rec.type = RecordType::Delete;
    rec.key = key;
    uint64_t size = log_.append(rec, wo);

    // the tombstone itself is dead too
    dead_ += old->recordSize + size;
    total_ += size;
    index_.erase(key);
    stats_.add("bytes_written", size);
}

int64_t Store::incr(const std::string& key, int64_t delta, const WriteOptions& wo) {
    const IndexEntry* old = index_.find(key);
    int64_t current = 0;
    if (old) {
        const char* s = old->value.c_str();
        char* endp = nullptr;
        errno = 0;
        long long v = std::strtoll(s, &endp, 10);
        if (old->value.empty() || *endp != '\0' || errno == ERANGE) {
            throw std::invalid_argument("value is not an integer");
        }
        current = v;
    }
    if ((delta > 0 && current > std::numeric_limits<int64_t>::max() - delta) ||
        (delta < 0 && current < std::numeric_limits<int64_t>::min() - delta)) {
        throw std::overflow_error("increment would overflow");
    }
    int64_t result = current + delta;
    std::string value = std::to_string(result);

    Record rec;
    rec.type = RecordType::Put;
    rec.key = key;
    rec.value = value;
    uint64_t size = log_.append(rec, wo);

    if (old) dead_ += old->recordSize;
    total_ += size;
    index_.put(key, value, size);
    stats_.add("bytes_written", size);
    return result;
}

size_t Store::append(const std::string& key, const std::string& suffix, const WriteOptions& wo) {
    const IndexEntry* old = index_.find(key);
    std::string value = old ? old->value + suffix : suffix;

    Record rec;
    rec.type = RecordType::Put;
    rec.key = key;
    rec.value = value;
    uint64_t size = log_.append(rec, wo);

    if (old) dead_ += old->recordSize;
    total_ += size;
    index_.put(key, value, size);
    stats_.add("bytes_written", size);
    return value.size();
}

std::string Store::getRange(const std::string& key, int64_t start, int64_t end) const {
    const IndexEntry* e = index_.find(key);
    if (!e) throw KeyNotFound(key);
    int64_t len = static_cast<int64_t>(e->value.size());
    if (start < 0 || end < start || end >= len) {
        throw std::out_of_range("index out of range");
    }
    return e->value.substr(static_cast<size_t>(start), static_cast<size_t>(end - start + 1));
}

void Store::compact() {
    log_.rewrite([&](const LogFile::RecordSink& write) {
        index_.forEach([&](const std::string& key, const IndexEntry& e) {
            Record rec;
            rec.type = RecordType::Put;
            rec.key = key;
            rec.value = e.value;
            write(rec);
        });
    });
    total_ = log_.size();
    dead_ = 0;
    stats_.add("compactions");
}

}  // namespace minikv
