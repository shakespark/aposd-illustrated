#include "store.h"

#include <cerrno>
#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <stdexcept>

#include "log_reader.h"
#include "record_parser.h"

namespace minikv {

Store::Store(const std::string& path, const Options& options)
    : path_(path), index_(options.index_reserve) {
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

uint64_t Store::handle(const Record& r) {
    uint64_t size = kRecordHeaderSize + r.key.size() + r.value.size();
    total_ += size;
    const IndexEntry* old = index_.find(r.key);
    if (old) dead_ += old->recordSize;
    if (r.type == RecordType::Put) {
        index_.put(r.key, r.value, size);
    } else {
        // the tombstone itself is dead too
        dead_ += size;
        index_.erase(r.key);
    }
    return size;
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

void Store::put(const std::string& key, const std::string& value, const WriteOptions& wo) {
    Record rec;
    rec.type = RecordType::Put;
    rec.key = key;
    rec.value = value;
    writer_.append(rec, wo);
    stats_.add("bytes_written", handle(rec));
}

bool Store::erase(const std::string& key, const WriteOptions& wo) {
    if (!index_.contains(key)) return false;
    Record rec;
    rec.type = RecordType::Delete;
    rec.key = key;
    writer_.append(rec, wo);
    stats_.add("bytes_written", handle(rec));
    return true;
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
