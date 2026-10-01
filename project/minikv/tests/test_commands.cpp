// Behaviour of each command, seen through Server::handle().
// Every mission must keep these tests passing unchanged.
#include <string>

#include "../src/server.h"
#include "test.h"

using minikv::Server;

TEST(set_then_get) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("SET name alice"), "OK");
    CHECK_EQ(s.handle("GET name"), "\"alice\"");
    CHECK_EQ(s.handle("SET name bob"), "OK");
    CHECK_EQ(s.handle("GET name"), "\"bob\"");
}

TEST(get_missing_is_nil) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("GET nothing"), "(nil)");
}

TEST(commands_are_case_insensitive) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("set k v"), "OK");
    CHECK_EQ(s.handle("Get k"), "\"v\"");
}

TEST(values_may_contain_spaces) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("SET greeting hello,  wide world "), "OK");
    CHECK_EQ(s.handle("GET greeting"), "\"hello,  wide world \"");
    CHECK_EQ(s.handle("APPEND greeting and more"), "(integer) 27");
    CHECK_EQ(s.handle("GET greeting"), "\"hello,  wide world and more\"");
}

TEST(values_are_escaped_in_replies) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("SET q say \"hi\" \\o/"), "OK");
    CHECK_EQ(s.handle("GET q"), "\"say \\\"hi\\\" \\\\o/\"");
    CHECK_EQ(s.handle("SET tab a\tb"), "OK");
    CHECK_EQ(s.handle("GET tab"), "\"a\\x09b\"");
}

TEST(blank_line_gives_empty_reply) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle(""), "");
    CHECK_EQ(s.handle("   "), "");
}

TEST(del_existing_key) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET a 1");
    CHECK_EQ(s.handle("DEL a"), "(integer) 1");
    CHECK_EQ(s.handle("GET a"), "(nil)");
    CHECK_EQ(s.handle("EXISTS a"), "(integer) 0");
}

TEST(exists) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("EXISTS a"), "(integer) 0");
    s.handle("SET a 1");
    CHECK_EQ(s.handle("EXISTS a"), "(integer) 1");
}

TEST(incr_creates_and_adds) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("INCR counter"), "(integer) 1");
    CHECK_EQ(s.handle("INCR counter"), "(integer) 2");
    CHECK_EQ(s.handle("INCR counter 40"), "(integer) 42");
    CHECK_EQ(s.handle("INCR counter -50"), "(integer) -8");
    CHECK_EQ(s.handle("GET counter"), "\"-8\"");
}

TEST(incr_rejects_bad_input) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET word hello");
    CHECK_ERR(s.handle("INCR word"));
    CHECK_EQ(s.handle("GET word"), "\"hello\"");
    CHECK_ERR(s.handle("INCR n abc"));
    CHECK_ERR(s.handle("INCR n 12abc"));
    s.handle("SET big 9223372036854775807");
    CHECK_ERR(s.handle("INCR big"));
    CHECK_EQ(s.handle("GET big"), "\"9223372036854775807\"");
}

TEST(append_creates_and_extends) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("APPEND log first"), "(integer) 5");
    CHECK_EQ(s.handle("APPEND log ,second"), "(integer) 12");
    CHECK_EQ(s.handle("GET log"), "\"first,second\"");
}

TEST(getrange_inside_value) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET s Hello World");
    CHECK_EQ(s.handle("GETRANGE s 0 4"), "\"Hello\"");
    CHECK_EQ(s.handle("GETRANGE s 6 10"), "\"World\"");
    CHECK_EQ(s.handle("GETRANGE s 4 4"), "\"o\"");
}

TEST(keys_with_prefix_sorted) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET user:2 b");
    s.handle("SET user:1 a");
    s.handle("SET order:1 x");
    CHECK_EQ(s.handle("KEYS user:"), "1) \"user:1\"\n2) \"user:2\"");
    CHECK_EQ(s.handle("KEYS"), "1) \"order:1\"\n2) \"user:1\"\n3) \"user:2\"");
    CHECK_EQ(s.handle("KEYS nope"), "(empty array)");
}

TEST(stats_reports_key_count) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET a 1");
    s.handle("SET b 2");
    std::string stats = s.handle("STATS");
    CHECK(test::startsWith(stats, "keys=2 "));
    CHECK(stats.find("log_bytes=") != std::string::npos);
    CHECK(stats.find("garbage_bytes=") != std::string::npos);
}

TEST(malformed_commands_are_errors) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_ERR(s.handle("FROB x"));
    CHECK_ERR(s.handle("SET onlykey"));
    CHECK_ERR(s.handle("GET"));
    CHECK_ERR(s.handle("GET a b"));
    CHECK_ERR(s.handle("DEL"));
    CHECK_ERR(s.handle("EXISTS"));
    CHECK_ERR(s.handle("INCR"));
    CHECK_ERR(s.handle("INCR a 1 2"));
    CHECK_ERR(s.handle("APPEND onlykey"));
    CHECK_ERR(s.handle("GETRANGE s 1"));
    CHECK_ERR(s.handle("GETRANGE s x 2"));
    CHECK_ERR(s.handle("KEYS a b"));
    CHECK_ERR(s.handle("STATS now"));
    CHECK_ERR(s.handle("COMPACT please"));
    CHECK_ERR(s.handle("GET " + std::string(300, 'k')));
}
