//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <sys/wait.h>
//
#define AGETTY      "/sbin/agetty"
#define NOISSUE     "--noissue"
#define NOCLEAR     "--noclear"
#define LHOSTNAME   "--long-hostname"
#define SKIPLOGIN   "--skip-login"
#define AUTOLOGIN   "--autologin"
#define USER        "root"
#define DEVICE      "tty1"
#define BAUDRATE    "38400"
#define TERMTYPE    "linux"
//
#define XINIT       "/usr/bin/xinit"
#define RCFILE      "/etc/X11/xinit/xinitrc"
#define SEP         "--"
#define TTYXX       "tty1"
#define VTXX        "vt3"
//
#define AGETTY_CMD                           \
    {                                        \
        AGETTY, NOISSUE, NOCLEAR, LHOSTNAME, \
        SKIPLOGIN, AUTOLOGIN, USER, DEVICE,  \
        BAUDRATE, TERMTYPE, NULL, NULL, NULL \
    }
//
#define XINIT_CMD                  \
    {                              \
        XINIT, RCFILE, SEP, TTYXX, \
        VTXX, NULL, NULL, NULL     \
    }
//
void  main(int			argc __attribute__((unused)),
           char			**argv __attribute__((unused)),
           const char	*envp)
{
    int status = 0;

    setenv("SHELL", "/bin/bash", 1);
    setenv("TTY", "/dev/tty1", 1);
    if (!fork()) {
        const char *agetty[] = AGETTY_CMD;
        execve(agetty[0],
               (char *const *)agetty,
               (char *const *)envp);
        exit(127);
    }
    waitpid(-1, &status, WNOHANG);
    sleep(1);
    const char *xinit[] = XINIT_CMD;
    execve(xinit[0],
           (char *const *)xinit,
           (char *const *)envp);
    exit(127);
}
