// RENAME, added in mission m07 (interface comment written first).
#include <string>

#include "../src/server.h"
#include "test.h"

using minikv::Server;

TEST(rename_moves_the_value) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET old hello world");
    CHECK_EQ(s.handle("RENAME old new"), "OK");
    CHECK_EQ(s.handle("GET new"), "\"hello world\"");
    CHECK_EQ(s.handle("EXISTS old"), "(integer) 0");
}

TEST(rename_replaces_an_existing_target) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET a 1");
    s.handle("SET b 2");
    CHECK_EQ(s.handle("RENAME a b"), "OK");
    CHECK_EQ(s.handle("GET b"), "\"1\"");
    CHECK_EQ(s.handle("GET a"), "(nil)");
}

TEST(rename_missing_source_changes_nothing) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET b 2");
    CHECK_EQ(s.handle("RENAME nothing b"), "ERR no such key");
    CHECK_EQ(s.handle("GET b"), "\"2\"");
}

TEST(rename_to_itself_keeps_the_value) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET a 1");
    CHECK_EQ(s.handle("RENAME a a"), "OK");
    CHECK_EQ(s.handle("GET a"), "\"1\"");
    CHECK_EQ(s.handle("RENAME nothing nothing"), "ERR no such key");
}

TEST(rename_survives_reopen) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    {
        Server s(path);
        s.handle("SET a 1");
        s.handle("SET b 2");
        s.handle("RENAME a b");
    }
    Server s(path);
    CHECK_EQ(s.handle("GET b"), "\"1\"");
    CHECK_EQ(s.handle("GET a"), "(nil)");
    CHECK(test::startsWith(s.handle("STATS"), "keys=1 "));
}

TEST(rename_needs_two_keys) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_ERR(s.handle("RENAME a"));
    CHECK_ERR(s.handle("RENAME a b c"));
}
