#include "store.h"

#include <cerrno>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <algorithm>
#include <fcntl.h>
#include <limits>

#include "log_reader.h"
#include "record_parser.h"

namespace minikv {

namespace {
const Options& checked(const Options& options) {
    std::string err = options.validate();
    if (!err.empty()) throw std::invalid_argument("invalid options: " + err);
    return options;
}
}  // namespace

Store::Store(const std::string& path, const Options& options)
    : options_(checked(options)), path_(path) {
    writeOptions_.sync = options_.sync_writes;
    index_.reserve(options_.index_reserve);
    load();
}

void Store::load() {
    LogReader reader;
    uint64_t end = 0;
    if (reader.open(path_)) {
        std::string raw;
        while (reader.next(raw)) {
            Record r;
            try {
                r = RecordParser::parse(raw);
            } catch (const std::exception& e) {
                throw std::runtime_error(path_ + ": bad record at offset " +
                                         std::to_string(reader.offset() - raw.size()) + ": " + e.what());
            }
            handle(r);
        }
        end = reader.offset();
    } else if (errno != ENOENT) {
        throw std::runtime_error("cannot open " + path_ + ": " + std::strerror(errno));
    }

    if (!writer_.open(path_, O_WRONLY | O_CREAT | O_APPEND, 0644, end)) {
        throw std::runtime_error("cannot open " + path_ + " for writing: " + std::strerror(errno));
    }
}

void Store::handle(const Record& r) {
    uint64_t size = kRecordHeaderSize + r.key.size() + r.value.size();
    total_ += size;
    const Entry* old = lookup(r.key);
    if (old) dead_ += old->recordSize;
    if (r.type == RecordType::Put) {
        index_[r.key] = Entry{r.value, size};
    } else {
        dead_ += size;
        index_.erase(r.key);
    }
}

std::pair<bool, std::string> Store::get(const std::string& key) const {
    const Entry* e = lookup(key);
    stats_.add(e ? "keyspace_hits" : "keyspace_misses");
    if (!e) return {false, ""};
    return {true, e->value};
}

bool Store::exists(const std::string& key) const {
    bool found = index_.count(key) > 0;
    stats_.add(found ? "keyspace_hits" : "keyspace_misses");
    return found;
}

std::vector<std::string> Store::keys(const std::string& prefix) const {
    std::vector<std::string> out;
    for (const auto& kv : index_) {
        if (kv.first.compare(0, prefix.size(), prefix) == 0) out.push_back(kv.first);
    }
    std::sort(out.begin(), out.end());
    return out;
}

void Store::set(const std::string& key, const std::string& value) {
    Record rec;
    rec.type = RecordType::Put;
    rec.key = key;
    rec.value = value;
    // write the record
    writer_.append(rec, writeOptions_);

    uint64_t size = kRecordHeaderSize + key.size() + value.size();
    // update dead
    const Entry* old = lookup(key);
    if (old) dead_ += old->recordSize;
    // update total
    total_ += size;
    // update index
    index_[key] = Entry{value, size};
    stats_.add("bytes_written", size);
    maybeCompact();
}

void Store::del(const std::string& key) {
    const Entry* old = lookup(key);
    if (!old) throw KeyNotFound(key);

    Record rec;
    rec.type = RecordType::Delete;
    rec.key = key;
    writer_.append(rec, writeOptions_);

    uint64_t size = kRecordHeaderSize + key.size();
    // the tombstone itself is dead too
    dead_ += old->recordSize + size;
    total_ += size;
    index_.erase(key);
    stats_.add("bytes_written", size);
    maybeCompact();
}

int64_t Store::incr(const std::string& key, int64_t delta) {
    const Entry* old = lookup(key);
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
    writer_.append(rec, writeOptions_);

    uint64_t size = kRecordHeaderSize + key.size() + value.size();
    if (old) dead_ += old->recordSize;
    total_ += size;
    index_[key] = Entry{value, size};
    stats_.add("bytes_written", size);
    maybeCompact();
    return result;
}

size_t Store::append(const std::string& key, const std::string& suffix) {
    const Entry* old = lookup(key);
    std::string value = old ? old->value + suffix : suffix;

    Record rec;
    rec.type = RecordType::Put;
    rec.key = key;
    rec.value = value;
    writer_.append(rec, writeOptions_);

    uint64_t size = kRecordHeaderSize + key.size() + value.size();
    if (old) dead_ += old->recordSize;
    total_ += size;
    index_[key] = Entry{value, size};
    stats_.add("bytes_written", size);
    maybeCompact();
    return value.size();
}

std::string Store::getRange(const std::string& key, int64_t start, int64_t end) const {
    const Entry* e = lookup(key);
    if (!e) throw KeyNotFound(key);
    int64_t len = static_cast<int64_t>(e->value.size());
    if (start < 0 || end < start || end >= len) {
        throw std::out_of_range("index out of range");
    }
    return e->value.substr(static_cast<size_t>(start), static_cast<size_t>(end - start + 1));
}

void Store::compact() {
    std::string tmp = path_ + ".compact";
    LogWriter out;
    if (!out.open(tmp, O_WRONLY | O_CREAT | O_TRUNC, 0644, 0)) {
        throw std::runtime_error("cannot create " + tmp + ": " + std::strerror(errno));
    }
    WriteOptions noSync;  // one fsync at the end is enough
    for (const auto& kv : index_) {
        Record rec;
        rec.type = RecordType::Put;
        rec.key = kv.first;
        rec.value = kv.second.value;
        out.append(rec, noSync);
    }
    if (!out.sync()) {
        throw std::runtime_error("fsync failed on " + tmp + ": " + std::strerror(errno));
    }
    uint64_t newSize = out.offset();
    out.close();

    writer_.close();
    if (std::rename(tmp.c_str(), path_.c_str()) != 0) {
        throw std::runtime_error("cannot rename " + tmp + ": " + std::strerror(errno));
    }
    if (!writer_.open(path_, O_WRONLY | O_APPEND, 0644, newSize)) {
        throw std::runtime_error("cannot reopen " + path_ + ": " + std::strerror(errno));
    }
    total_ = newSize;
    dead_ = 0;
    stats_.add("compactions");
}

std::string Store::stats() const {
    std::string out = "keys=" + std::to_string(index_.size()) +
                      " log_bytes=" + std::to_string(total_) +
                      " garbage_bytes=" + std::to_string(dead_);
    std::string counters = stats_.format();
    if (!counters.empty()) out += " " + counters;
    return out;
}

const Store::Entry* Store::lookup(const std::string& key) const {
    auto it = index_.find(key);
    return it == index_.end() ? nullptr : &it->second;
}

void Store::maybeCompact() {
    if (++writesSinceCheck_ < options_.compaction_check_interval) return;
    writesSinceCheck_ = 0;
    if (dead_ < options_.compaction_min_bytes) return;
    if (static_cast<double>(dead_) < options_.compaction_ratio * static_cast<double>(total_)) return;
    compact();
}

}  // namespace minikv
