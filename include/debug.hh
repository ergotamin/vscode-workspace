#pragma once
#// (c) 2018 MIT License
#// Marcel Bobolz
#// <ergotamin.source@gmail.com>
#include <workspace.hh>

#define XSIGNAL_LIST   \
    X("SIGTEST", 0)    \
    X("SIGHUP", 1)     \
    X("SIGQUIT", 3)    \
    X("SIGTRAP", 5)    \
    X("SIGKILL", 9)    \
    X("SIGBUS", 10)    \
    X("SIGSYS", 12)    \
    X("SIGPIPE", 13)   \
    X("SIGALRM", 14)   \
    X("SIGURG", 16)    \
    X("SIGSTOP", 17)   \
    X("SIGTSTP", 18)   \
    X("SIGCONT", 19)   \
    X("SIGCHLD", 20)   \
    X("SIGTTIN", 21)   \
    X("SIGTTOU", 22)   \
    X("SIGPOLL", 23)   \
    X("SIGXCPU", 24)   \
    X("SIGXFSZ", 25)   \
    X("SIGVTALRM", 26) \
    X("SIGPROF", 27)   \
    X("SIGUSR1", 30)   \
    X("SIGUSR2", 31)

#define X(key, value) { .name = key, .signo = value },
static const struct {
    const char	*name;
    unsigned	signo;
} SignalInfo[24] = {
    XSIGNAL_LIST
    { nullptr, 0 }
};
#undef X
#undef XSIGNAL_LIST

#define SigFmt \
    "[%.10s (=%.2d)]"

#define SigInfo(id) \
    SignalInfo[id].name, SignalInfo[id].signo

#define once(...)        \
    ({                   \
        do {             \
            __VA_ARGS__; \
        } while (!1);    \
    })
