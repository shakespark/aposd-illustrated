// What happens when the log on disk is damaged.
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <string>

#include "../src/server.h"
#include "test.h"

using minikv::Server;

namespace {

// Writes three keys and returns the size of the log after the first two.
uintmax_t writeThreeKeys(const std::string& path) {
    Server s(path);
    s.handle("SET a apple");
    s.handle("SET b banana");
    uintmax_t afterTwo = std::filesystem::file_size(path);
    s.handle("SET c cherry");
    return afterTwo;
}

void flipByte(const std::string& path, uintmax_t offset) {
    std::fstream f(path, std::ios::in | std::ios::out | std::ios::binary);
    f.seekg(static_cast<std::streamoff>(offset));
    char c = 0;
    f.read(&c, 1);
    c = static_cast<char>(c ^ 0x5A);
    f.seekp(static_cast<std::streamoff>(offset));
    f.write(&c, 1);
}

}  // namespace

TEST(torn_last_record_refuses_to_open) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    writeThreeKeys(path);
    // Simulate a crash in the middle of the last write.
    std::filesystem::resize_file(path, std::filesystem::file_size(path) - 3);
    bool threw = false;
    try {
        Server s(path);
    } catch (const std::runtime_error&) {
        threw = true;
    }
    CHECK(threw);
}

TEST(corrupt_record_refuses_to_open) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    writeThreeKeys(path);
    flipByte(path, 20);  // inside the second record (the first is 19 bytes)
    bool threw = false;
    try {
        Server s(path);
    } catch (const std::runtime_error&) {
        threw = true;
    }
    CHECK(threw);
}
