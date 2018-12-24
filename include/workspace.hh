#pragma once
#// (c) 2018 MIT License
#// Marcel Bobolz
#// <ergotamin.source@gmail.com>
#include <cconfig.hh>
// system headers
#include <cstdlib>
#include <cstdio>
#include <unistd.h>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <climits>
#include <csignal>
#include <cassert>
#include <cerrno>
#include <atomic>
#include <string>
#include <tuple>
#include <array>
#include <vector>
#include <iostream>
#include <ostream>
#include <utility>
#include <new>
#include <memory>
#include <exception>
#include <thread>
// attribute-macros
#define __const           __attribute__((const))
#define __flat            __attribute__((flatten))
#define __notnull(...)    __attribute__((nonnull ## __VA_ARGS__)))
#define __section(label)  __attribute__((section(#label)))
