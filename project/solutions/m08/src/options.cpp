#include "options.h"

namespace minikv {

std::string Options::validate() const {
    if (!(compaction_ratio > 0.0 && compaction_ratio <= 1.0)) {
        return "compaction_ratio must be in (0, 1]";
    }
    if (compaction_check_interval == 0) {
        return "compaction_check_interval must be at least 1";
    }
    if (index_reserve > (size_t(1) << 32)) {
        return "index_reserve is unreasonably large";
    }
    return "";
}

}  // namespace minikv
