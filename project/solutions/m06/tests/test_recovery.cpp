// What happens when the log on disk is damaged (mission m06):
//  - an incomplete last record, as left by a crash during a write, is
//    dropped with a warning and the store opens normally;
//  - damage anywhere before the last record stops the process with a
//    message that says where the damage is.
#include <csignal>
#include <filesystem>
#include <fcntl.h>
#include <fstream>
#include <string>
#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>

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

// Silences stderr for the lifetime of the object (the warnings are expected).
class QuietStderr {
public:
    QuietStderr() : saved_(dup(STDERR_FILENO)) {
        int devnull = open("/dev/null", O_WRONLY);
        dup2(devnull, STDERR_FILENO);
        close(devnull);
    }
    ~QuietStderr() {
        dup2(saved_, STDERR_FILENO);
        close(saved_);
    }

private:
    int saved_;
};

struct ChildResult {
    bool aborted = false;
    std::string stderrText;
};

// Opens the log in a child process, so that a crash does not take the
// test runner down with it.
ChildResult openInChild(const std::string& path) {
    int fds[2];
    if (pipe(fds) != 0) return {};
    pid_t pid = fork();
    if (pid == 0) {
        struct rlimit noCore = {0, 0};
        setrlimit(RLIMIT_CORE, &noCore);
        dup2(fds[1], STDERR_FILENO);
        close(fds[0]);
        close(fds[1]);
        { Server s(path); }
        _exit(0);
    }
    close(fds[1]);
    ChildResult result;
    char buf[512];
    ssize_t n;
    while ((n = read(fds[0], buf, sizeof buf)) > 0) result.stderrText.append(buf, static_cast<size_t>(n));
    close(fds[0]);
    int status = 0;
    waitpid(pid, &status, 0);
    result.aborted = WIFSIGNALED(status) && WTERMSIG(status) == SIGABRT;
    return result;
}

}  // namespace

TEST(torn_last_record_is_dropped) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    uintmax_t afterTwo = writeThreeKeys(path);
    // Simulate a crash in the middle of the last write.
    std::filesystem::resize_file(path, std::filesystem::file_size(path) - 3);
    {
        QuietStderr quiet;
        Server s(path);
        CHECK_EQ(s.handle("GET a"), "\"apple\"");
        CHECK_EQ(s.handle("GET b"), "\"banana\"");
        CHECK_EQ(s.handle("GET c"), "(nil)");
        CHECK_EQ(std::filesystem::file_size(path), afterTwo);
        CHECK_EQ(s.handle("SET d date"), "OK");
    }
    Server s(path);
    CHECK_EQ(s.handle("GET d"), "\"date\"");
    CHECK_EQ(s.handle("GET b"), "\"banana\"");
}

TEST(torn_header_is_dropped) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    uintmax_t afterTwo = writeThreeKeys(path);
    // Only the first few bytes of the third record's header made it to disk.
    std::filesystem::resize_file(path, afterTwo + 5);
    QuietStderr quiet;
    Server s(path);
    CHECK_EQ(s.handle("GET b"), "\"banana\"");
    CHECK_EQ(s.handle("GET c"), "(nil)");
    CHECK_EQ(std::filesystem::file_size(path), afterTwo);
}

TEST(bad_checksum_on_last_record_is_dropped) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    uintmax_t afterTwo = writeThreeKeys(path);
    // The record is complete in length but its bytes never reached the disk.
    flipByte(path, std::filesystem::file_size(path) - 1);
    QuietStderr quiet;
    Server s(path);
    CHECK_EQ(s.handle("GET b"), "\"banana\"");
    CHECK_EQ(s.handle("GET c"), "(nil)");
    CHECK_EQ(std::filesystem::file_size(path), afterTwo);
}

TEST(damage_before_the_last_record_crashes_with_a_clear_message) {
    test::TempDir dir;
    std::string path = dir.file("db.log");
    writeThreeKeys(path);
    flipByte(path, 15);  // inside the first record (bytes 0..18)
    auto before = std::filesystem::file_size(path);
    ChildResult r = openInChild(path);
    CHECK(r.aborted);
    CHECK(r.stderrText.find("offset 0") != std::string::npos);
    CHECK(r.stderrText.find("Refusing to start") != std::string::npos);
    // Nothing was "repaired" behind the operator's back.
    CHECK_EQ(std::filesystem::file_size(path), before);
}
