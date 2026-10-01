#include "server.h"

#include <cctype>
#include <iomanip>
#include <sstream>
#include <stdexcept>

#include "parse_int.h"

namespace minikv {

namespace {

const size_t kMaxKeyLength = 256;

std::string toUpper(std::string s) {
    for (char& c : s) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    return s;
}

std::string toLower(std::string s) {
    for (char& c : s) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return s;
}

bool isSpace(char c) {
    return std::isspace(static_cast<unsigned char>(c)) != 0;
}

// Splits `text` into words separated by runs of whitespace. If `maxWords` is
// not 0 and the text has more words than that, the last word returned is
// everything from the start of word number `maxWords` to the end of the
// text, whitespace included.
std::vector<std::string> splitWords(const std::string& text, size_t maxWords) {
    std::vector<std::string> words;
    size_t i = 0;
    while (true) {
        while (i < text.size() && isSpace(text[i])) i++;
        if (i == text.size()) break;
        if (maxWords != 0 && words.size() + 1 == maxWords) {
            words.push_back(text.substr(i));
            break;
        }
        size_t j = i;
        while (j < text.size() && !isSpace(text[j])) j++;
        words.push_back(text.substr(i, j - i));
        i = j;
    }
    return words;
}

}  // namespace

Server::Server(const std::string& path, const Options& options) : db_(path, options) {
    writeOptions_.sync = options.sync_writes;
    //                         handler                  min max  key?   rest of line?
    commands_["SET"]      = {&Server::handleSet,      2, 2, true,  true};
    commands_["GET"]      = {&Server::handleGet,      1, 1, true,  false};
    commands_["DEL"]      = {&Server::handleDel,      1, 1, true,  false};
    commands_["EXISTS"]   = {&Server::handleExists,   1, 1, true,  false};
    commands_["INCR"]     = {&Server::handleIncr,     1, 2, true,  false};
    commands_["APPEND"]   = {&Server::handleAppend,   2, 2, true,  true};
    commands_["GETRANGE"] = {&Server::handleGetRange, 3, 3, true,  false};
    commands_["KEYS"]     = {&Server::handleKeys,     0, 1, false, false};
    commands_["STATS"]    = {&Server::handleStats,    0, 0, false, false};
    commands_["COMPACT"]  = {&Server::handleCompact,  0, 0, false, false};
}

std::string Server::handle(const std::string& line) {
    std::vector<std::string> nameAndRest = splitWords(line, 2);
    if (nameAndRest.empty()) return "";
    const std::string& name = nameAndRest[0];
    auto it = commands_.find(toUpper(name));
    if (it == commands_.end()) return "ERR unknown command '" + name + "'";
    const Command& cmd = it->second;

    Args args;
    if (nameAndRest.size() == 2) args = splitWords(nameAndRest[1], cmd.restOfLine ? cmd.maxArgs : 0);
    if (args.size() < cmd.minArgs || args.size() > cmd.maxArgs) {
        return "ERR wrong number of arguments for '" + toLower(name) + "'";
    }
    if (cmd.firstIsKey && args[0].size() > kMaxKeyLength) return "ERR key too long";
    return (this->*cmd.handler)(args);
}

std::string Server::handleSet(const Args& args) {
    try {
        db_.set(args[0], args[1], writeOptions_);
        return "OK";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleGet(const Args& args) {
    try {
        if (!db_.exists(args[0])) return "(nil)";
        auto r = db_.get(args[0]);
        return bulk(r.second, true, true);
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleDel(const Args& args) {
    try {
        db_.del(args[0], writeOptions_);
        return "(integer) 1";
    } catch (const KeyNotFound&) {
        return "ERR no such key";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleExists(const Args& args) {
    try {
        return db_.exists(args[0]) ? "(integer) 1" : "(integer) 0";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleIncr(const Args& args) {
    int64_t delta = 1;
    if (args.size() == 2 && !parseInt64(args[1], delta)) return "ERR delta is not an integer";
    try {
        int64_t v = db_.incr(args[0], delta, writeOptions_);
        return "(integer) " + std::to_string(v);
    } catch (const std::invalid_argument& e) {
        return std::string("ERR ") + e.what();
    } catch (const std::overflow_error& e) {
        return std::string("ERR ") + e.what();
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleAppend(const Args& args) {
    try {
        size_t n = db_.append(args[0], args[1], writeOptions_);
        return "(integer) " + std::to_string(n);
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleGetRange(const Args& args) {
    int64_t start = 0, end = 0;
    if (!parseInt64(args[1], start) || !parseInt64(args[2], end)) {
        return "ERR start and end must be integers";
    }
    try {
        return bulk(db_.getRange(args[0], start, end), true, true);
    } catch (const KeyNotFound&) {
        return "ERR no such key";
    } catch (const std::out_of_range&) {
        return "ERR index out of range";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleKeys(const Args& args) {
    std::string prefix = args.empty() ? "" : args[0];
    try {
        std::vector<std::string> keys = db_.keys(prefix);
        if (keys.empty()) return "(empty array)";
        std::string out;
        for (size_t i = 0; i < keys.size(); i++) {
            if (i > 0) out += '\n';
            out += std::to_string(i + 1) + ") " + bulk(keys[i], true, true);
        }
        return out;
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleStats(const Args&) {
    return bulk(db_.stats(), false, false);
}

std::string Server::handleCompact(const Args&) {
    try {
        db_.compact();
        return "OK";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

// Formats s for a reply.
std::string Server::bulk(const std::string& s, bool quote, bool escape) const {
    std::ostringstream out;
    if (quote) out << '"';
    for (char c : s) {
        unsigned char u = static_cast<unsigned char>(c);
        if (escape && (c == '"' || c == '\\')) {
            out << '\\' << c;
        } else if (escape && !std::isprint(u)) {
            out << "\\x" << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(u) << std::dec;
        } else {
            out << c;
        }
    }
    if (quote) out << '"';
    return out.str();
}

}  // namespace minikv
