#include "server.h"

#include <cctype>
#include <iomanip>
#include <sstream>
#include <stdexcept>

namespace minikv {

namespace {

const size_t kMaxKeyLength = 256;

std::string toUpper(std::string s) {
    for (char& c : s) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    return s;
}

bool isSpace(char c) {
    return std::isspace(static_cast<unsigned char>(c)) != 0;
}

}  // namespace

Server::Server(const std::string& path, const Options& options) : db_(path, options) {
    writeOptions_.sync = options.sync_writes;
    handlers_["SET"] = &Server::handleSet;
    handlers_["GET"] = &Server::handleGet;
    handlers_["DEL"] = &Server::handleDel;
    handlers_["EXISTS"] = &Server::handleExists;
    handlers_["INCR"] = &Server::handleIncr;
    handlers_["APPEND"] = &Server::handleAppend;
    handlers_["GETRANGE"] = &Server::handleGetRange;
    handlers_["KEYS"] = &Server::handleKeys;
    handlers_["STATS"] = &Server::handleStats;
    handlers_["COMPACT"] = &Server::handleCompact;
}

std::string Server::handle(const std::string& line) {
    tokenize(line);
    if (args_.empty()) return "";
    auto it = handlers_.find(toUpper(args_[0]));
    if (it == handlers_.end()) return "ERR unknown command '" + args_[0] + "'";
    return (this->*(it->second))();
}

// Splits the line on whitespace into args_. Values of SET and APPEND may
// contain spaces, so for those two commands we stop after the key and put
// the rest of the line into rawValue_.
void Server::tokenize(const std::string& line) {
    args_.clear();
    rawValue_.clear();
    size_t i = 0;
    while (i < line.size()) {
        while (i < line.size() && isSpace(line[i])) i++;
        if (i == line.size()) break;
        size_t j = i;
        while (j < line.size() && !isSpace(line[j])) j++;
        args_.push_back(line.substr(i, j - i));
        i = j;

        if (args_.size() == 2) {
            std::string cmd = toUpper(args_[0]);
            if (cmd == "SET" || cmd == "APPEND") {
                while (i < line.size() && isSpace(line[i])) i++;
                rawValue_ = line.substr(i);
                return;
            }
        }
    }
}

std::string Server::handleSet() {
    if (args_.size() != 2 || rawValue_.empty()) return "ERR wrong number of arguments for 'set'";
    const std::string& key = args_[1];
    if (key.size() > kMaxKeyLength) return "ERR key too long";
    try {
        db_.set(key, rawValue_, writeOptions_);
        return "OK";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleGet() {
    if (args_.size() != 2) return "ERR wrong number of arguments for 'get'";
    const std::string& key = args_[1];
    if (key.size() > kMaxKeyLength) return "ERR key too long";
    try {
        if (!db_.exists(key)) return "(nil)";
        auto r = db_.get(key);
        return bulk(r.second, true, true);
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleDel() {
    if (args_.size() != 2) return "ERR wrong number of arguments for 'del'";
    const std::string& key = args_[1];
    if (key.size() > kMaxKeyLength) return "ERR key too long";
    try {
        db_.del(key, writeOptions_);
        return "(integer) 1";
    } catch (const KeyNotFound&) {
        return "ERR no such key";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleExists() {
    if (args_.size() != 2) return "ERR wrong number of arguments for 'exists'";
    const std::string& key = args_[1];
    if (key.size() > kMaxKeyLength) return "ERR key too long";
    try {
        return db_.exists(key) ? "(integer) 1" : "(integer) 0";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleIncr() {
    if (args_.size() != 2 && args_.size() != 3) return "ERR wrong number of arguments for 'incr'";
    const std::string& key = args_[1];
    if (key.size() > kMaxKeyLength) return "ERR key too long";
    int64_t delta = 1;
    if (args_.size() == 3) {
        try {
            size_t pos = 0;
            delta = std::stoll(args_[2], &pos);
            if (pos != args_[2].size()) return "ERR delta is not an integer";
        } catch (const std::exception&) {
            return "ERR delta is not an integer";
        }
    }
    try {
        int64_t v = db_.incr(key, delta, writeOptions_);
        return "(integer) " + std::to_string(v);
    } catch (const std::invalid_argument& e) {
        return std::string("ERR ") + e.what();
    } catch (const std::overflow_error& e) {
        return std::string("ERR ") + e.what();
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleAppend() {
    if (args_.size() != 2 || rawValue_.empty()) return "ERR wrong number of arguments for 'append'";
    const std::string& key = args_[1];
    try {
        size_t n = db_.append(key, rawValue_, writeOptions_);
        return "(integer) " + std::to_string(n);
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleGetRange() {
    if (args_.size() != 4) return "ERR wrong number of arguments for 'getrange'";
    const std::string& key = args_[1];
    if (key.size() > kMaxKeyLength) return "ERR key too long";
    int64_t start = 0, end = 0;
    try {
        start = std::stoll(args_[2]);
        end = std::stoll(args_[3]);
    } catch (const std::exception&) {
        return "ERR start and end must be integers";
    }
    try {
        return bulk(db_.getRange(key, start, end), true, true);
    } catch (const KeyNotFound&) {
        return "ERR no such key";
    } catch (const std::out_of_range&) {
        return "ERR index out of range";
    } catch (const std::exception& e) {
        return std::string("ERR ") + e.what();
    }
}

std::string Server::handleKeys() {
    if (args_.size() > 2) return "ERR wrong number of arguments for 'keys'";
    std::string prefix = args_.size() == 2 ? args_[1] : "";
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

std::string Server::handleStats() {
    if (args_.size() != 1) return "ERR wrong number of arguments for 'stats'";
    return bulk(db_.stats(), false, false);
}

std::string Server::handleCompact() {
    if (args_.size() != 1) return "ERR wrong number of arguments for 'compact'";
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
