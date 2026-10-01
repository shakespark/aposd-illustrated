#pragma once

#include <map>
#include <string>
#include <vector>

#include "database.h"
#include "options.h"

namespace minikv {

// Server executes text commands (one per line) against a Database and
// formats the replies. See README.md for the command list.
class Server {
public:
    explicit Server(const std::string& path, const Options& options = Options());

    // Executes one command line and returns the reply. Multi-line replies
    // are separated by '\n' with no trailing newline. A blank line yields "".
    std::string handle(const std::string& line);

private:
    using Handler = std::string (Server::*)();

    void tokenize(const std::string& line);

    std::string handleSet();
    std::string handleGet();
    std::string handleDel();
    std::string handleExists();
    std::string handleIncr();
    std::string handleAppend();
    std::string handleGetRange();
    std::string handleKeys();
    std::string handleStats();
    std::string handleCompact();

    Database db_;
    WriteOptions writeOptions_;
    std::map<std::string, Handler> handlers_;

    // Set by tokenize().
    std::vector<std::string> args_;
    std::string rawValue_;
};

}  // namespace minikv
