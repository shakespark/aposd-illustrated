#pragma once

#include <stdexcept>

namespace minikv {

// Thrown when one request cannot be carried out because of what it asks for
// (for example INCR on a value that is not a number). Server::handle() turns
// it into an "ERR <message>" reply and goes on with the next request.
//
// Every other exception means minikv itself is in trouble (the log cannot
// be written, memory is exhausted, ...). Those are deliberately not caught
// per request: they propagate out of Server::handle() and end the process.
class RequestError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

}  // namespace minikv
