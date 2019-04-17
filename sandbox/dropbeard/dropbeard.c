// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//      daemonizes the dropbear-ssh-server
//      launched as android init.rc-service
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/stat.h>
//
#define not_used     __attribute__((unused))
#define DBEAR_PASS   "ufeellite"
#define DBEAR_PATH   "/data/dropbear"
#define HOME_PATH    "/data/local/home"
//
unsigned int daemonize(unsigned int check)
{
    long td_fd;

    if ((1 == check)
        && (1 == getppid()))
        return 1;

    td_fd = sysconf(_SC_OPEN_MAX);

    do
        close(td_fd);
    while (td_fd--);

    if (0 > daemon(0, 0))
        exit(1);
    else if (0 > setsid())
        exit(1);
    else if (0 > chdir(DBEAR_PATH))
        exit(1);
    else
        umask(027);

    return 1;
}
//
static int exec_dbear(char *const *envp)
{
    static const char *command[] = {
        "su",
        "-c",
        "/system/bin/dropbear "
        "-p 22 -R -A -N root " \
        "-C " DBEAR_PASS " "   \
        "-U root -G root",
        NULL
    };

    setenv("HOME", HOME_PATH, 1);

    return execvpe(command[0],
                   (char *const *)
                   command, envp);
}
//
int main(int argc		not_used,
         char **argv	not_used,
         char *const	envp[])
{
    return (1 == daemonize(0))
           ? exec_dbear(envp)
           : (1);
}
