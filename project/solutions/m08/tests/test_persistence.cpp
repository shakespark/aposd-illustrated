// Data must survive closing and reopening the log, including after
// compaction. Every mission must keep these tests passing unchanged.
#include <filesystem>
#include <string>

#include "../src/server.h"
#include "test.h"

using minikv::Server;

TEST(reopen_restores_values) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    {
        Server s(path);
        s.handle("SET a 1");
        s.handle("SET b two words");
        s.handle("SET a 3");
        s.handle("INCR n 5");
        s.handle("APPEND b !");
    }
    Server s(path);
    CHECK_EQ(s.handle("GET a"), "\"3\"");
    CHECK_EQ(s.handle("GET b"), "\"two words!\"");
    CHECK_EQ(s.handle("GET n"), "\"5\"");
    CHECK(test::startsWith(s.handle("STATS"), "keys=3 "));
}

TEST(reopen_remembers_deletes) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    {
        Server s(path);
        s.handle("SET a 1");
        s.handle("SET b 2");
        s.handle("DEL a");
    }
    Server s(path);
    CHECK_EQ(s.handle("GET a"), "(nil)");
    CHECK_EQ(s.handle("GET b"), "\"2\"");
}

TEST(reopen_twice_and_keep_writing) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    {
        Server s(path);
        s.handle("SET a 1");
    }
    {
        Server s(path);
        s.handle("INCR a");
    }
    Server s(path);
    CHECK_EQ(s.handle("GET a"), "\"2\"");
}

TEST(empty_log_file_is_fine) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    { Server s(path); }
    CHECK(std::filesystem::exists(path));
    Server s(path);
    CHECK_EQ(s.handle("KEYS"), "(empty array)");
}

TEST(compact_shrinks_log_and_keeps_data) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    {
        Server s(path);
        for (int i = 0; i < 50; i++) s.handle("SET k value-" + std::to_string(i));
        s.handle("SET other x");
        s.handle("SET gone y");
        s.handle("DEL gone");
        auto before = std::filesystem::file_size(path);
        CHECK_EQ(s.handle("COMPACT"), "OK");
        auto after = std::filesystem::file_size(path);
        CHECK(after < before / 5);
        CHECK_EQ(s.handle("GET k"), "\"value-49\"");
        CHECK(s.handle("STATS").find("garbage_bytes=0") != std::string::npos);
        s.handle("SET k after-compact");
    }
    Server s(path);
    CHECK_EQ(s.handle("GET k"), "\"after-compact\"");
    CHECK_EQ(s.handle("GET other"), "\"x\"");
    CHECK_EQ(s.handle("GET gone"), "(nil)");
}

TEST(log_compacts_itself_under_overwrites) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    std::string big(1000, 'x');
    {
        Server s(path);
        for (int i = 0; i < 3000; i++) s.handle("SET hot " + std::to_string(i) + big);
        // 3000 writes of ~1 KB would be ~3 MB without compaction.
        CHECK(std::filesystem::file_size(path) < 1500 * 1000);
        CHECK(s.handle("STATS").find("compactions=") != std::string::npos);
    }
    Server s(path);
    CHECK_EQ(s.handle("GET hot"), "\"2999" + big + "\"");
}
