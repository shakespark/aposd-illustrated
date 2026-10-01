#pragma once

#include <cstdint>
#include <map>
#include <string>

namespace minikv {

// Named counters, reported by the STATS command.
class Stats {
public:
    void add(const std::string& name, uint64_t delta = 1) { counters_[name] += delta; }

    uint64_t get(const std::string& name) const {
        auto it = counters_.find(name);
        return it == counters_.end() ? 0 : it->second;
    }

    // "name=value name=value ...", sorted by name.
    std::string format() const {
        std::string out;
        for (const auto& kv : counters_) {
            if (!out.empty()) out += ' ';
            out += kv.first + "=" + std::to_string(kv.second);
        }
        return out;
    }

private:
    std::map<std::string, uint64_t> counters_;
};

}  // namespace minikv
