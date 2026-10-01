#pragma once

#include <cstddef>
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
    // Arguments of a command, not including the command name.
    using Args = std::vector<std::string>;
    using Handler = std::string (Server::*)(const Args& args);

    // Describes a command's arguments. handle() checks the arguments against
    // this description before calling the handler, so a handler can assume
    // minArgs <= args.size() <= maxArgs and, if firstIsKey, a valid key in
    // args[0].
    struct Command {
        Handler handler;
        size_t minArgs;
        size_t maxArgs;
        bool firstIsKey;   // args[0] is a key and must be at most kMaxKeyLength bytes
        bool restOfLine;   // the last argument is the rest of the line, spaces included
    };

    std::string handleSet(const Args& args);
    std::string handleGet(const Args& args);
    std::string handleDel(const Args& args);
    std::string handleExists(const Args& args);
    std::string handleIncr(const Args& args);
    std::string handleAppend(const Args& args);
    std::string handleGetRange(const Args& args);
    std::string handleKeys(const Args& args);
    std::string handleStats(const Args& args);
    std::string handleCompact(const Args& args);

    std::string bulk(const std::string& s, bool quote, bool escape) const;

    Database db_;
    WriteOptions writeOptions_;
    std::map<std::string, Command> commands_;  // keyed by upper-case name
};

}  // namespace minikv
