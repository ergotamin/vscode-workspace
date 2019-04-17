// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
#include <syswatch.h>
//
unsigned int thread_continue = 1;
//
void __clean_exit(int signo)
{
    if (SIGINT == signo)
        __builtin_exit(0);
}
//
int main(int argc, char **argv)
{
    argv++;
    --argc;

    if (argc) {
        int d;
        signal(SIGINT, __clean_exit);

        if (!fork())
            __cpu_stats();
        if (!fork())
            __mem_stats();
        if (!fork())
            __net_stats(*argv);

        waitpid((pid_t)-1, &d, 0U);

        return d;
    }
    return 1;
}
