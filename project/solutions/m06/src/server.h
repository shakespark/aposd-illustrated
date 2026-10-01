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
    // A request that cannot be carried out gets an "ERR ..." reply. Failures
    // of minikv itself (for example the log cannot be written) are thrown:
    // after such a failure the log may end in a partial record, and going on
    // would bury it under new records, so the caller should stop.
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

    std::string bulk(const std::string& s, bool quote, bool escape) const;

    Database db_;
    WriteOptions writeOptions_;
    std::map<std::string, Handler> handlers_;

    // Set by tokenize().
    std::vector<std::string> args_;
    std::string rawValue_;
};

}  // namespace minikv
