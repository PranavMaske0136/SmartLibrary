
cmake_minimum_required(VERSION 3.10)

project(SmartLibraryBackend)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(
    smartlibrary_server
    src/main.cpp
    src/database.cpp
    src/sqlite3.c
)

target_include_directories(
    smartlibrary_server
    PRIVATE include
)

target_link_libraries(
    smartlibrary_server
    PRIVATE
    ws2_32
)
