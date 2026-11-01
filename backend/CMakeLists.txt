cmake_minimum_required(VERSION 3.10)

project(SmartLibraryBackend C CXX)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# -----------------------------------------------------------------------------
# Source Files
# -----------------------------------------------------------------------------
set(SOURCE_FILES
    src/main.cpp
    src/database.cpp
    src/books.cpp
    src/students.cpp
    src/issue_return.cpp
)

# -----------------------------------------------------------------------------
# Locate PostgreSQL (libpq)
# -----------------------------------------------------------------------------
# Standard search for PostgreSQL libraries and headers.
# On Windows, you can provide hints via:
#   cmake -B build -DPostgreSQL_ROOT="C:/Program Files/PostgreSQL/16"
find_package(PostgreSQL REQUIRED)

message(STATUS "PostgreSQL Found:")
message(STATUS "  Include Dirs: ${PostgreSQL_INCLUDE_DIRS}")
message(STATUS "  Libraries:    ${PostgreSQL_LIBRARIES}")
message(STATUS "  Version:      ${PostgreSQL_VERSION_STRING}")

# -----------------------------------------------------------------------------
# Target Executable Definition
# -----------------------------------------------------------------------------
add_executable(smartlibrary_server ${SOURCE_FILES})

target_include_directories(
    smartlibrary_server
    PRIVATE
    include
    ${PostgreSQL_INCLUDE_DIRS}
)

target_link_libraries(
    smartlibrary_server
    PRIVATE
    ${PostgreSQL_LIBRARIES}
    ws2_32
)
