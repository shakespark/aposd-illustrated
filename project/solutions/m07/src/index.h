#pragma once

#include <cstddef>
#include <cstdint>
#include <functional>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

namespace minikv {

struct IndexEntry {
    std::string value;
    // Bytes taken in the log by the record that set `value`. They become
    // garbage when the key is overwritten or deleted.
    uint64_t recordSize = 0;
};

// The current value of every live key, kept in memory. Knows nothing about
// the log; Store keeps the two in step.
class Index {
public:
    // `reserve` is the number of keys to make room for up front.
    explicit Index(size_t reserve);

    // A copy of the value of `key`, or nullopt if it is absent.
    std::optional<std::string> get(const std::string& key) const;

    bool contains(const std::string& key) const;

    // The entry for `key`, or nullptr if it is absent. The pointer is valid
    // only until the next put() or erase(), either of which may move entries.
    const IndexEntry* find(const std::string& key) const;

    // Inserts `key` or replaces its entry.
    void put(const std::string& key, const std::string& value, uint64_t recordSize);

    // Removes `key`. Returns false if it was already absent.
    bool erase(const std::string& key);

    // All keys that start with `prefix`, sorted. Scans every key.
    std::vector<std::string> keysWithPrefix(const std::string& prefix) const;

    // Calls `fn` once for each entry, in no particular order. `fn` must not
    // modify the index.
    void forEach(const std::function<void(const std::string&, const IndexEntry&)>& fn) const;

    // Number of keys.
    size_t size() const { return map_.size(); }

private:
    std::unordered_map<std::string, IndexEntry> map_;
};

}  // namespace minikv
