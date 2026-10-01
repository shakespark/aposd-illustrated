// A tiny test framework: TEST(name) { ... } plus CHECK / CHECK_EQ.
// Every test gets a fresh temporary directory (see TempDir) and runs in
// the same process; tests/test_main.cpp runs them all and prints a summary.
#pragma once

#include <cstdlib>
#include <filesystem>
#include <functional>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace test {

struct Case {
    const char* name;
    std::function<void()> fn;
};

inline std::vector<Case>& registry() {
    static std::vector<Case> cases;
    return cases;
}

inline int& failures() {
    static int n = 0;
    return n;
}

struct Registrar {
    Registrar(const char* name, std::function<void()> fn) { registry().push_back({name, std::move(fn)}); }
};

inline void fail(const char* file, int line, const std::string& msg) {
    std::cerr << "    " << file << ":" << line << ": " << msg << "\n";
    failures()++;
}

// A directory under the system temp dir, removed when the object dies.
class TempDir {
public:
    TempDir() {
        std::string tmpl = (std::filesystem::temp_directory_path() / "minikv-test-XXXXXX").string();
        if (!mkdtemp(tmpl.data())) {
            std::cerr << "mkdtemp failed\n";
            std::exit(1);
        }
        path_ = tmpl;
    }
    ~TempDir() {
        std::error_code ec;
        std::filesystem::remove_all(path_, ec);
    }
    std::string file(const std::string& name) const { return (path_ / name).string(); }

private:
    std::filesystem::path path_;
};

inline bool startsWith(const std::string& s, const std::string& prefix) {
    return s.compare(0, prefix.size(), prefix) == 0;
}

}  // namespace test

#define TEST_CAT2(a, b) a##b
#define TEST_CAT(a, b) TEST_CAT2(a, b)
#define TEST(name)                                                              \
    static void name();                                                         \
    static test::Registrar TEST_CAT(registrar_, name)(#name, name);             \
    static void name()

#define CHECK(cond)                                                             \
    do {                                                                        \
        if (!(cond)) test::fail(__FILE__, __LINE__, "CHECK(" #cond ") failed"); \
    } while (0)

#define CHECK_EQ(actual, expected)                                              \
    do {                                                                        \
        auto&& a_ = (actual);                                                   \
        auto&& e_ = (expected);                                                 \
        if (!(a_ == e_)) {                                                      \
            std::ostringstream os_;                                             \
            os_ << #actual << "\n      got:      " << a_                        \
                << "\n      expected: " << e_;                                  \
            test::fail(__FILE__, __LINE__, os_.str());                          \
        }                                                                       \
    } while (0)

// Checks that `reply` is an error reply ("ERR ...").
#define CHECK_ERR(reply)                                                        \
    do {                                                                        \
        std::string r_ = (reply);                                               \
        if (!test::startsWith(r_, "ERR "))                                      \
            test::fail(__FILE__, __LINE__, #reply " should be an error, got: " + r_); \
    } while (0)
