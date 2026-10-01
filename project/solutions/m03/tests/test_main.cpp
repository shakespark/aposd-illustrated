#include <exception>
#include <iostream>

#include "test.h"

int main() {
    int failedTests = 0;
    for (const test::Case& c : test::registry()) {
        int before = test::failures();
        try {
            c.fn();
        } catch (const std::exception& e) {
            test::fail(__FILE__, __LINE__, std::string("uncaught exception: ") + e.what());
        }
        bool ok = test::failures() == before;
        if (!ok) failedTests++;
        std::cout << (ok ? "  ok    " : "  FAIL  ") << c.name << "\n";
    }
    size_t total = test::registry().size();
    std::cout << "\n" << (total - failedTests) << "/" << total << " tests passed\n";
    return failedTests == 0 ? 0 : 1;
}
