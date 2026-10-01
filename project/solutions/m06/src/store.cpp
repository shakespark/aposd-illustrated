#include "store.h"

#include <algorithm>
#include <cerrno>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <filesystem>
#include <limits>
#include <unistd.h>

#include "log_reader.h"
#include "record_parser.h"
#include "request_error.h"

namespace minikv {

namespace {

// The log is damaged in a way minikv cannot repair on its own. Continuing
// would mean serving a data set with an unknown hole in it, so stop here
// and tell the operator exactly where the damage is.
[[noreturn]] void fatal(const std::string& msg) {
    std::fprintf(stderr, "minikv: fatal: %s\n", msg.c_str());
    std::abort();
}

}  // namespace

Store::Store(const std::string& path, const Options& options)
    : path_(path), index_(options.index_reserve) {
    load();
}

void Store::load() {
    LogReader reader;
    uint64_t end = 0;
    if (reader.open(path_)) {
        // A crash in the middle of append() leaves an incomplete last record.
        // That is an expected consequence of crashing, not damage: drop the
        // partial record and start normally. Anything wrong *before* the
        // last record cannot come from an interrupted write, so it is fatal.
        uint64_t fileSize = std::filesystem::file_size(path_);
        std::string raw;
        while (true) {
            uint64_t start = reader.offset();
            auto damaged = [&](const std::string& why) {
                fatal(path_ + ": record at offset " + std::to_string(start) + " is damaged (" + why +
                      ") and more data follows it, so it is not an interrupted write. "
                      "Refusing to start. Restore the file from a backup, or truncate it to " +
                      std::to_string(start) + " bytes to drop this record and everything after it.");
            };
            bool more = false;
            try {
                more = reader.next(raw);
            } catch (const TruncatedRecord&) {
                dropTornTail(start, fileSize);
                break;
            } catch (const std::exception& e) {
                damaged(e.what());
            }
            if (!more) break;

            Record r;
            try {
                r = RecordParser::parse(raw);
            } catch (const std::exception& e) {
                // A complete-looking last record with a bad checksum is what a
                // write cut short by power loss can leave behind.
                if (reader.offset() == fileSize) {
                    dropTornTail(start, fileSize);
                    break;
                }
                damaged(e.what());
            }
            handle(r);
            end = reader.offset();
        }
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
    const IndexEntry* old = index_.find(r.key);
    if (old) dead_ += old->recordSize;
    if (r.type == RecordType::Put) {
        index_.put(r.key, r.value, size);
    } else {
        dead_ += size;
        index_.erase(r.key);
    }
}

void Store::dropTornTail(uint64_t goodBytes, uint64_t fileSize) {
    std::fprintf(stderr,
                 "minikv: warning: %s: dropping an incomplete last record (%llu bytes at offset %llu), "
                 "probably left by a crash during a write\n",
                 path_.c_str(), static_cast<unsigned long long>(fileSize - goodBytes),
                 static_cast<unsigned long long>(goodBytes));
    if (::truncate(path_.c_str(), static_cast<off_t>(goodBytes)) != 0) {
        throw std::runtime_error("cannot truncate " + path_ + ": " + std::strerror(errno));
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
    writer_.append(rec, wo);

    uint64_t size = kRecordHeaderSize + key.size() + value.size();
    // update dead
    const IndexEntry* old = index_.find(key);
    if (old) dead_ += old->recordSize;
    // update total
    total_ += size;
    // update index
    index_.put(key, value, size);
    stats_.add("bytes_written", size);
}

bool Store::del(const std::string& key, const WriteOptions& wo) {
    const IndexEntry* old = index_.find(key);
    if (!old) return false;  // already absent: nothing to do, nothing to log

    Record rec;
    rec.type = RecordType::Delete;
    rec.key = key;
    writer_.append(rec, wo);

    uint64_t size = kRecordHeaderSize + key.size();
    // the tombstone itself is dead too
    dead_ += old->recordSize + size;
    total_ += size;
    index_.erase(key);
    stats_.add("bytes_written", size);
    return true;
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
            throw RequestError("value is not an integer");
        }
        current = v;
    }
    if ((delta > 0 && current > std::numeric_limits<int64_t>::max() - delta) ||
        (delta < 0 && current < std::numeric_limits<int64_t>::min() - delta)) {
        throw RequestError("increment would overflow");
    }
    int64_t result = current + delta;
    std::string value = std::to_string(result);

    Record rec;
    rec.type = RecordType::Put;
    rec.key = key;
    rec.value = value;
    writer_.append(rec, wo);

    uint64_t size = kRecordHeaderSize + key.size() + value.size();
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
    writer_.append(rec, wo);

    uint64_t size = kRecordHeaderSize + key.size() + value.size();
    if (old) dead_ += old->recordSize;
    total_ += size;
    index_.put(key, value, size);
    stats_.add("bytes_written", size);
    return value.size();
}

std::string Store::getRange(const std::string& key, int64_t start, int64_t end) const {
    const IndexEntry* e = index_.find(key);
    if (!e) return "";
    int64_t len = static_cast<int64_t>(e->value.size());
    if (start < 0) start += len;
    if (end < 0) end += len;
    start = std::max<int64_t>(start, 0);
    end = std::min<int64_t>(end, len - 1);
    if (start > end) return "";
    return e->value.substr(static_cast<size_t>(start), static_cast<size_t>(end - start + 1));
}

void Store::compact() {
    std::string tmp = path_ + ".compact";
    LogWriter out;
    if (!out.open(tmp, O_WRONLY | O_CREAT | O_TRUNC, 0644, 0)) {
        throw std::runtime_error("cannot create " + tmp + ": " + std::strerror(errno));
    }
    WriteOptions noSync;  // one fsync at the end is enough
    index_.forEach([&](const std::string& key, const IndexEntry& e) {
        Record rec;
        rec.type = RecordType::Put;
        rec.key = key;
        rec.value = e.value;
        out.append(rec, noSync);
    });
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

}  // namespace minikv
