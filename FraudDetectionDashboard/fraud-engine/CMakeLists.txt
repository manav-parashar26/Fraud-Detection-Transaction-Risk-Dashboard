cmake_minimum_required(VERSION 3.10)
project(FraudDetectionEngine VERSION 1.0.0 LANGUAGES CXX)

# Enforce C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Find and link platform threads (pthreads on Linux/POSIX)
find_package(Threads REQUIRED)

# Include header directory
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# Source files
set(SOURCES
    src/main.cpp
    src/TransactionGenerator.cpp
    src/FraudInjector.cpp
    src/FraudDetector.cpp
    src/TransactionGraph.cpp
    src/DSU.cpp
    src/RiskScorer.cpp
    src/JsonSerializer.cpp
    src/StreamSimulator.cpp
)

# Executable target
add_executable(fraud_engine ${SOURCES})

# Target-specific include directories and libraries
target_include_directories(fraud_engine PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_link_libraries(fraud_engine PRIVATE Threads::Threads)
