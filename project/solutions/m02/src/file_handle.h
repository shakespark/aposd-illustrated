#pragma once

#include <string>
#include <sys/types.h>

namespace minikv {

// Owns a POSIX file descriptor and closes it on destruction.
class FileHandle {
public:
    FileHandle() = default;
    ~FileHandle();
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;

    // Calls open(2). Returns false on failure; errno is left set.
    bool open(const std::string& path, int flags, mode_t mode);

    // Each of these calls the system call of the same name once.
    ssize_t read(void* buf, size_t n);
    ssize_t write(const void* buf, size_t n);
    off_t seek(off_t offset, int whence);
    bool sync();
    void close();

    bool isOpen() const { return fd_ >= 0; }
    int fd() const { return fd_; }

private:
    int fd_ = -1;
};

}  // namespace minikv
