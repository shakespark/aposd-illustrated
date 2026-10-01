CXX      ?= g++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -O2
CPPFLAGS += -MMD -MP

BUILD    := build
LIB_SRCS := $(filter-out src/main.cpp,$(wildcard src/*.cpp))
LIB_OBJS := $(LIB_SRCS:%.cpp=$(BUILD)/%.o)
TEST_SRCS := $(wildcard tests/*.cpp)
TEST_OBJS := $(TEST_SRCS:%.cpp=$(BUILD)/%.o)

.PHONY: all test bench clean

all: minikv

minikv: $(LIB_OBJS) $(BUILD)/src/main.o
	$(CXX) $(CXXFLAGS) -o $@ $^

$(BUILD)/run_tests: $(LIB_OBJS) $(TEST_OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^

$(BUILD)/run_bench: $(LIB_OBJS) $(BUILD)/bench/bench.o
	$(CXX) $(CXXFLAGS) -o $@ $^

test: minikv $(BUILD)/run_tests
	./$(BUILD)/run_tests

bench: $(BUILD)/run_bench
	./$(BUILD)/run_bench

$(BUILD)/%.o: %.cpp
	@mkdir -p $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -c -o $@ $<

clean:
	rm -rf $(BUILD) minikv

-include $(LIB_OBJS:.o=.d) $(TEST_OBJS:.o=.d) $(BUILD)/src/main.d $(BUILD)/bench/bench.d
