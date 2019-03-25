#/* !inject_atexit.cc */
#// (c) 2019 MIT License
#// Marcel Bobolz
#// <ergotamin.source@gmail.com>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <unistd.h>

#include <cstdlib>
#include <cstdio>
#include <cstddef>
#include <unistd.h>
#include <fcntl.h>
#include <cstring>
#include <mutex>
//
static std::mutex mtx;
//
template<typename CharT>
static char *cat(const CharT *cat)
{
    return strdup(cat);
}
//
template<typename CharT, typename ... Vargs>
static char *cat(const CharT *c, const CharT *a, Vargs... targs)
{
    static char *shelf = strdup(c);

    if (0 != *a) {
        realloc((void *)shelf, strlen(a) + 64);
        strcat(shelf, "\x20");
        strcat(shelf, a);
        strcat(shelf, "\x20");
        mtx.try_lock();
        strcat(shelf, cat(targs ...));
        mtx.unlock();
    }

    return cat((const char *)shelf);
}

extern const char *__progname;

__attribute__(())
[[using gnu: constructor(101)]]
static void __inject__(void) throw()
{
    using namespace std;
    if (!fork()) {
        __sync_synchronize();
        FILE *p;
        char out[512];
        static char *cmd = strdup("{ pgrep ");
        strcat(cmd, __progname);
        strcat(cmd, "; }\000");
_join:
        p = popen(cmd, "r");
        fgets(out, 512, p);
        fflush(p);
        pclose(p);
        if (3 > strlen(out)) {
            puts("\nNo process found\n");
            exit(0);
        } else {
            puts("\nFound one or more instances...\n");
            memset(out, 0, sizeof(out));
            p = NULL;
            sleep(5);
            goto _join;
        }
    }
}
