#pragma once

#include <cstdint>
#include <string>

namespace minikv {

// Counters reported by the STATS command. Plain fields rather than a map
// keyed by name: they are bumped on every command, and a misspelled field
// name is a compile error instead of a new, silently empty counter.
struct Stats {
    uint64_t bytes_written = 0;    // bytes appended to the log, compaction excluded
    uint64_t compactions = 0;
    uint64_t keyspace_hits = 0;    // GETs that found their key
    uint64_t keyspace_misses = 0;  // GETs that did not

    // "bytes_written=N compactions=N keyspace_hits=N keyspace_misses=N"
    std::string format() const {
        return "bytes_written=" + std::to_string(bytes_written) +
               " compactions=" + std::to_string(compactions) +
               " keyspace_hits=" + std::to_string(keyspace_hits) +
               " keyspace_misses=" + std::to_string(keyspace_misses);
    }
};

}  // namespace minikv
