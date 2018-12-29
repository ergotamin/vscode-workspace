#pragma once
#// (c) 2018 MIT License
#// Marcel Bobolz
#// <ergotamin.source@gmail.com>
static_assert(__GNUG__, "Your compiler is not supporting GnuExtensions !");
#/**/ undef  /**/ __cplusplus
#/**/ define /**/ __cplusplus       202012L
#/**/ define /**/ __Begin           extern "C" {
#/**/ define /**/ __End             }
#pragma ident                       __BASE_FILE__
// system headers
#include <cstdlib>
#include <cstdio>
#include <unistd.h>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <fstream>
#include <ostream>
#include <climits>
#include <csignal>
#include <cassert>
#include <cerrno>
#include <atomic>
#include <string>
#include <tuple>
#include <array>
#include <vector>
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
// colored cli-output
#define fg(r, g, b)       "\x1b[38:2:" << r << ":" << g << ":" << b << "m"
#define bg(r, g, b)       "\x1b[48:2:" << r << ":" << g << ":" << b << "m"
#define sgr()             "\x1b(B\x1b[m"
#define bold()            "\x1b[1m"
#define smul()            "\x1b[4m"
#define sitm()            "\x1b[3m"
#define el1()             "\x1b[1K"
#define up1()             "\x1b[A"

#define pout(...) \
    std::cout << __VA_ARGS__ << endl;

#define perr(...) \
    std::cerr << fg("255", "0", "0") << __VA_ARGS__ << sgr() << std::endl;
