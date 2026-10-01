// Requests that used to be errors and are now defined so that they always
// succeed (mission m06). DEL means "make sure the key is absent"; GETRANGE
// clamps its positions to the value, like slicing in Python or Redis.
#include <filesystem>
#include <string>

#include "../src/server.h"
#include "test.h"

using minikv::Server;

TEST(del_missing_key_is_not_an_error) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    Server s(path);
    CHECK_EQ(s.handle("DEL nothing"), "(integer) 0");
    s.handle("SET a 1");
    CHECK_EQ(s.handle("DEL a"), "(integer) 1");
    auto size = std::filesystem::file_size(path);
    CHECK_EQ(s.handle("DEL a"), "(integer) 0");
    // Deleting an absent key changes nothing, so nothing is logged.
    CHECK_EQ(std::filesystem::file_size(path), size);
}

TEST(getrange_clamps_to_the_value) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET s Hello");
    CHECK_EQ(s.handle("GETRANGE s 0 4"), "\"Hello\"");
    CHECK_EQ(s.handle("GETRANGE s 0 5"), "\"Hello\"");
    CHECK_EQ(s.handle("GETRANGE s 2 100"), "\"llo\"");
    CHECK_EQ(s.handle("GETRANGE s -100 1"), "\"He\"");
    CHECK_EQ(s.handle("GETRANGE s 10 20"), "\"\"");
    CHECK_EQ(s.handle("GETRANGE s 3 2"), "\"\"");
}

TEST(getrange_negative_positions_count_from_the_end) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET s Hello");
    CHECK_EQ(s.handle("GETRANGE s -3 -1"), "\"llo\"");
    CHECK_EQ(s.handle("GETRANGE s 0 -1"), "\"Hello\"");
    CHECK_EQ(s.handle("GETRANGE s -1 -1"), "\"o\"");
}

TEST(getrange_missing_key_is_empty) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    CHECK_EQ(s.handle("GETRANGE nothing 0 1"), "\"\"");
}

TEST(request_errors_still_reach_the_client) {
    test::TempDir dir;
    Server s(dir.file("db.log"));
    s.handle("SET word hello");
    CHECK_EQ(s.handle("INCR word"), "ERR value is not an integer");
    s.handle("SET big 9223372036854775807");
    CHECK_EQ(s.handle("INCR big"), "ERR increment would overflow");
    // The server keeps working after a failed request.
    CHECK_EQ(s.handle("INCR n"), "(integer) 1");
}
