// minikv: a small key-value store with a line-based command interface.
//
// Usage: minikv [options] <log-file>
// Reads one command per line from stdin and prints one reply per command.

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <string>
#include <unistd.h>

#include "options.h"
#include "server.h"

namespace {

void usage() {
    std::cerr << "usage: minikv [options] <log-file>\n"
                 "  --sync                        fsync after every write\n"
                 "  --compact-ratio=R             garbage ratio that triggers compaction (0 < R <= 1, default 0.5)\n"
                 "  --compact-min-bytes=N         minimum garbage before compaction (default 1048576)\n"
                 "  --compact-check-interval=N    check for compaction every N writes (default 100)\n"
                 "  --index-reserve=N             number of keys to reserve space for (default 1024)\n";
}

// If `arg` is "--name=value", stores value in `out` and returns true.
bool flagValue(const std::string& arg, const std::string& name, std::string& out) {
    std::string prefix = "--" + name + "=";
    if (arg.compare(0, prefix.size(), prefix) != 0) return false;
    out = arg.substr(prefix.size());
    return true;
}

bool parseArgs(int argc, char** argv, minikv::Options& opts, std::string& path) {
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        std::string v;
        try {
            if (arg == "--sync") {
                opts.sync_writes = true;
            } else if (flagValue(arg, "compact-ratio", v)) {
                opts.compaction_ratio = std::stod(v);
            } else if (flagValue(arg, "compact-min-bytes", v)) {
                opts.compaction_min_bytes = std::stoull(v);
            } else if (flagValue(arg, "compact-check-interval", v)) {
                opts.compaction_check_interval = static_cast<uint32_t>(std::stoul(v));
            } else if (flagValue(arg, "index-reserve", v)) {
                opts.index_reserve = std::stoull(v);
            } else if (arg.size() > 1 && arg[0] == '-') {
                std::cerr << "minikv: unknown option " << arg << "\n";
                return false;
            } else if (path.empty()) {
                path = arg;
            } else {
                std::cerr << "minikv: more than one log file given\n";
                return false;
            }
        } catch (const std::exception&) {
            std::cerr << "minikv: bad value in " << arg << "\n";
            return false;
        }
    }
    return !path.empty();
}

}  // namespace

int main(int argc, char** argv) {
    minikv::Options opts;
    std::string path;
    if (!parseArgs(argc, argv, opts, path)) {
        usage();
        return 2;
    }

    try {
        minikv::Server server(path, opts);
        bool interactive = isatty(STDIN_FILENO);
        std::string line;
        while (true) {
            if (interactive) std::cout << "minikv> " << std::flush;
            if (!std::getline(std::cin, line)) break;
            if (!line.empty() && line.back() == '\r') line.pop_back();
            if (line == "QUIT" || line == "quit") break;
            std::string reply = server.handle(line);
            if (!reply.empty()) std::cout << reply << "\n";
        }
    } catch (const std::exception& e) {
        std::cerr << "minikv: " << e.what() << "\n";
        return 1;
    }
    return 0;
}
