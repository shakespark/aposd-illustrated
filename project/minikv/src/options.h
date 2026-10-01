#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

namespace minikv {

// Tuning knobs for a Database. The defaults are reasonable for small data
// sets; see "调参" in README.md before changing them.
struct Options {
    // Compaction is triggered when, at a check, the log holds at least
    // compaction_min_bytes of garbage AND garbage makes up at least
    // compaction_ratio of the log. Valid range for the ratio: (0, 1].
    double compaction_ratio = 0.5;
    uint64_t compaction_min_bytes = 1 << 20;

    // Garbage is only checked every this many write commands, to keep the
    // check off the write path. Must be at least 1.
    uint32_t compaction_check_interval = 100;

    // Number of keys the in-memory index reserves space for at startup.
    // Set it close to the expected number of keys to avoid rehashing.
    size_t index_reserve = 1024;

    // Call fsync(2) after every write command. Safer, much slower.
    bool sync_writes = false;

    // Returns "" if the options are usable, otherwise a description of the
    // first problem found.
    std::string validate() const;
};

// Options that apply to a single write.
struct WriteOptions {
    bool sync = false;
};

}  // namespace minikv
