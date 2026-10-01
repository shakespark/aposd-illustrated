// Error replies for requests that are well-formed but cannot be satisfied.
#include <string>

#include "../src/server.h"
#include "test.h"

using minikv::Server;

TEST(del_missing_key_is_an_error) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("DEL nothing"), "ERR no such key");
    s.handle("SET a 1");
    s.handle("DEL a");
    CHECK_EQ(s.handle("DEL a"), "ERR no such key");
}

TEST(getrange_out_of_range_is_an_error) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET s Hello");
    CHECK_EQ(s.handle("GETRANGE s 0 5"), "ERR index out of range");
    CHECK_EQ(s.handle("GETRANGE s 3 2"), "ERR index out of range");
    CHECK_EQ(s.handle("GETRANGE s -1 2"), "ERR index out of range");
}

TEST(getrange_missing_key_is_an_error) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("GETRANGE nothing 0 1"), "ERR no such key");
}
