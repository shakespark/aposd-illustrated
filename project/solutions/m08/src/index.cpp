#include "index.h"

#include <algorithm>

namespace minikv {

Index::Index(size_t reserve) {
    map_.reserve(reserve);
}

bool Index::contains(const std::string& key) const {
    return map_.count(key) > 0;
}

const IndexEntry* Index::find(const std::string& key) const {
    auto it = map_.find(key);
    return it == map_.end() ? nullptr : &it->second;
}

void Index::put(const std::string& key, const std::string& value, uint64_t recordSize) {
    IndexEntry& e = map_[key];
    e.value = value;
    e.recordSize = recordSize;
}

bool Index::erase(const std::string& key) {
    return map_.erase(key) > 0;
}

std::vector<std::string> Index::keysWithPrefix(const std::string& prefix) const {
    std::vector<std::string> out;
    for (const auto& kv : map_) {
        if (kv.first.compare(0, prefix.size(), prefix) == 0) out.push_back(kv.first);
    }
    std::sort(out.begin(), out.end());
    return out;
}

void Index::forEach(const std::function<void(const std::string&, const IndexEntry&)>& fn) const {
    for (const auto& kv : map_) fn(kv.first, kv.second);
}

}  // namespace minikv
