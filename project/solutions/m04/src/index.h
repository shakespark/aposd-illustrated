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
    uint64_t recordSize = 0;  // size of the record in the log
};

// In-memory index from key to its latest value.
class Index {
public:
    // Gets the value for the key.
    std::optional<std::string> get(const std::string& key) const;

    // Returns true if the index contains the key.
    bool contains(const std::string& key) const;

    // Finds the entry for the key.
    const IndexEntry* find(const std::string& key) const;

    // Puts the value for the key.
    void put(const std::string& key, const std::string& value, uint64_t recordSize);

    // Erases the key.
    bool erase(const std::string& key);

    // Returns the keys that start with prefix, sorted.
    std::vector<std::string> keysWithPrefix(const std::string& prefix) const;

    // Calls fn for each entry.
    void forEach(const std::function<void(const std::string&, const IndexEntry&)>& fn) const;

    // Returns the size.
    size_t size() const { return map_.size(); }

private:
    std::unordered_map<std::string, IndexEntry> map_;
};

}  // namespace minikv
