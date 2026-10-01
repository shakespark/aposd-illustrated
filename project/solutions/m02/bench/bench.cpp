// Micro-benchmark for the command path: `make bench`.
//
// Loads N keys with 100-byte values, then times GET hits, GET misses and
// SET overwrites through Server::handle(), i.e. exactly what one line of
// input costs (minus terminal I/O). Each measurement is repeated and the
// median is printed, in nanoseconds per command.
#include <algorithm>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <filesystem>
#include <string>
#include <unistd.h>
#include <vector>

#include "../src/server.h"

namespace {

constexpr int kKeys = 100000;
constexpr int kOps = 1000000;
constexpr int kRounds = 5;

// Keeps the compiler from discarding replies.
size_t sink = 0;

template <typename Fn>
double medianNsPerOp(size_t ops, Fn fn) {
    std::vector<double> results;
    for (int round = 0; round < kRounds; round++) {
        auto start = std::chrono::steady_clock::now();
        fn();
        auto end = std::chrono::steady_clock::now();
        results.push_back(std::chrono::duration<double, std::nano>(end - start).count() / ops);
    }
    std::sort(results.begin(), results.end());
    return results[results.size() / 2];
}

}  // namespace

int main() {
    std::string path = (std::filesystem::temp_directory_path() / ("minikv-bench-" + std::to_string(getpid()) + ".log")).string();
    std::filesystem::remove(path);

    std::vector<std::string> getHit, getMiss, set;
    for (int i = 0; i < kOps; i++) {
        std::string key = "key:" + std::to_string((int64_t(i) * 7919) % kKeys);
        getHit.push_back("GET " + key);
        getMiss.push_back("GET missing:" + std::to_string(i % kKeys));
    }
    for (int i = 0; i < kOps / 10; i++) {
        set.push_back("SET key:" + std::to_string((int64_t(i) * 7919) % kKeys) + " " + std::string(100, 'v'));
    }

    {
        minikv::Server server(path);
        std::string value(100, 'v');
        for (int i = 0; i < kKeys; i++) server.handle("SET key:" + std::to_string(i) + " " + value);

        std::printf("minikv micro-benchmark: %d keys, 100-byte values, median of %d rounds\n", kKeys, kRounds);
        double hit = medianNsPerOp(getHit.size(), [&] {
            for (const std::string& line : getHit) sink += server.handle(line).size();
        });
        std::printf("  GET (hit)   %8.1f ns/op\n", hit);
        double miss = medianNsPerOp(getMiss.size(), [&] {
            for (const std::string& line : getMiss) sink += server.handle(line).size();
        });
        std::printf("  GET (miss)  %8.1f ns/op\n", miss);
        double write = medianNsPerOp(set.size(), [&] {
            for (const std::string& line : set) sink += server.handle(line).size();
        });
        std::printf("  SET         %8.1f ns/op  (no fsync; includes the write(2) call)\n", write);
    }
    std::filesystem::remove(path);
    return sink == 0 ? 1 : 0;
}
