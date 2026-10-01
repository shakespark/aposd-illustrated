// minikv: a small key-value store with a line-based command interface.
//
// Usage: minikv [--sync] <log-file>
// Reads one command per line from stdin and prints one reply per command.

#include <iostream>
#include <string>
#include <unistd.h>

#include "options.h"
#include "server.h"

namespace {

void usage() {
    std::cerr << "usage: minikv [--sync] <log-file>\n"
                 "  --sync    fsync after every write: an acknowledged write survives power loss,\n"
                 "            but each write waits for the disk\n";
}

bool parseArgs(int argc, char** argv, minikv::Options& opts, std::string& path) {
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--sync") {
            opts.sync_writes = true;
        } else if (arg.size() > 1 && arg[0] == '-') {
            std::cerr << "minikv: unknown option " << arg << "\n";
            return false;
        } else if (path.empty()) {
            path = arg;
        } else {
            std::cerr << "minikv: more than one log file given\n";
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
