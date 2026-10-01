#include "file_handle.h"

#include <fcntl.h>
#include <unistd.h>

namespace minikv {

FileHandle::~FileHandle() {
    close();
}

bool FileHandle::open(const std::string& path, int flags, mode_t mode) {
    close();
    fd_ = ::open(path.c_str(), flags, mode);
    return fd_ >= 0;
}

ssize_t FileHandle::read(void* buf, size_t n) {
    return ::read(fd_, buf, n);
}

ssize_t FileHandle::write(const void* buf, size_t n) {
    return ::write(fd_, buf, n);
}

off_t FileHandle::seek(off_t offset, int whence) {
    return ::lseek(fd_, offset, whence);
}

bool FileHandle::sync() {
    return ::fsync(fd_) == 0;
}

void FileHandle::close() {
    if (fd_ >= 0) {
        ::close(fd_);
        fd_ = -1;
    }
}

}  // namespace minikv
