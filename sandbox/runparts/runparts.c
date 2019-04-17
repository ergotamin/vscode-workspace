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
#include <limits.h>
#include <sys/stat.h>
#include <string.h>
#include <dirent.h>
#include <fnmatch.h>
//
#define not_used     __attribute__((unused))
// used by find()
typedef struct {
    unsigned int	fc;     // file count
    char			**fv;   // files names
} files_t;
//
static char *__strduploc(void *, const char *);
int __run(const char *shell, char *path);
files_t *__find(const char *pattern);
int runparts(const char *shell, const char *dir);
//
#define strduploc(str) \
    __strduploc(alloca(strlen(str) + 1), (const char *)str)
//
static char *__strduploc(void *dest, const char *src)
{
    memcpy(dest, (const void *)src, strlen(src) + 1);
    return (char *)dest;
}
//
int __run(const char *shell, char *path)
{
    char **shcmd = (char **)alloca(4 * sizeof(char *));

    shcmd[0] = strduploc(shell);
    shcmd[1] = strduploc("-c");
    shcmd[2] = strduploc(path);
    shcmd[3] = NULL;

    free((void *)path);

    return execve(
        (const char *)shcmd[0],
        (char *const *)shcmd,
        (char *const *)NULL);
}
// fixup for missing glob()
files_t *__find(const char *pattern)
{
    DIR *cwd = NULL;
    files_t *files = NULL;
    struct dirent *dir = NULL;

    files = (files_t *)calloc(1, sizeof(files_t));
    files->fv = (char **)calloc(8, sizeof(char *));
    files->fc = 0;

    cwd = opendir(".");

    if (NULL == cwd)
        return NULL;

    while (NULL != (dir = readdir(cwd)))
        if (0 == fnmatch(pattern, dir->d_name, 0))
            files->fv[files->fc++] = realpath(dir->d_name, NULL);

    if (-1 == closedir(cwd))
        return NULL;

    return files;
}
//
int runparts(const char *shell, const char *dir)
{
    files_t *files = NULL;

    if (0 > chdir(dir))
        return 1;

    if (NULL == (files = __find("*.sh")))
        return 1;

    while (files->fc--) {
        if ((fork() == 0)) {
            chmod(*files->fv, 0755);
            return __run(shell, *files->fv);
        } else {
            files->fv++;
        }
    }

    free((void *)files);

    return 0;
}
//
int main(int argc	not_used,
         char		**argv)
{
    if (argc == 3)
        return runparts(argv[1], argv[2]);
    else
        return 1;
}
