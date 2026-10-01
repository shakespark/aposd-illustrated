#pragma once

namespace minikv {

// Settings for a Database. Everything else (when to compact, how much
// memory to reserve) is decided by minikv itself.
struct Options {
    // Call fsync(2) after every write command, so that an acknowledged write
    // survives a power failure. Without it, a write survives a crash of
    // minikv but may be lost if the machine goes down. Syncing makes each
    // write roughly as slow as the disk's flush latency.
    bool sync_writes = false;
};

// Options that apply to a single write.
struct WriteOptions {
    bool sync = false;
};

}  // namespace minikv
