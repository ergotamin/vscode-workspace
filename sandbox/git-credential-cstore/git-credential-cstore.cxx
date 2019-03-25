//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <unistd.h>
#include <dlfcn.h>
#include <sys/wait.h>
//
extern const char *__progname;
//
const char *strtoe(const char *str)
{
    unsigned long dest[2];
    char *arg = __builtin_strdup(str);
    char fract[8];
    unsigned long n = __builtin_strlen(arg) / (8UL);

    ;
    if (__builtin_strlen(arg) % 8UL)
        ++n;
    ;
    char temp[32];
    char estr[(1 << 3) * (n + 2) + 128];
    ;
    __builtin_memset(estr, 0, (1 << 3) * (n + 2) + 128);
    ;
    __builtin_sprintf(estr, "%s%lu%s",
                      "static const unsigned long auth[", n + 1, "] = {\n");
    ;
    for (n ? n : n++; n; n--) {
        ;
        dest[0] = 0UL;
        dest[1] = dest[0];
        ;
        __builtin_memset(fract, 0, 8UL);
        __builtin_memset(temp, 0, 32UL);
        ;
        __builtin_memcpy(fract, arg, 8UL);
        __builtin_memcpy(&dest[0], fract, 8UL);
        ;
        __builtin_sprintf(temp, "%llpUL,", dest[0]);
        __builtin_strcat(estr, temp);
        ;
        *arg = 0;
        ;
        arg = __builtin_strdup(arg + 8);
    }
    __builtin_strcat(estr, "0x00UL\n};\n");
    return (const char *)__builtin_strdup(estr);
}
//
static int store(void)
{
    const char *cstore_user_fmt = \
        "static const char *user = \"%s\";\n";

    ;
    const char *cstore_func =                        \
        "void __get_credentials(void){\n"            \
        "__builtin_printf(\"username=ergotamin\\n\"" \
        ",user);\n"                                  \
        "__builtin_printf(\"password=%s\\n\","       \
        "((const unsigned char *)&auth));\n"         \
        "}";

    ;
    char user[128];
    char auth[128];
    ;
    __builtin_printf("\nusername=");
    fgets(user, 128, stdin);
    fflush(stdin);
    user[__builtin_strlen(user) - 1] = 0;
    ;
    __builtin_printf("\npassword=");
    fgets(auth, 128, stdin);
    fflush(stdin);
    auth[__builtin_strlen(auth) - 1] = 0;
    ;
    FILE *src = fopen("/tmp/0XC0DE.c", "w+");
    ;
    fprintf(src, cstore_user_fmt, user);
    fprintf(src, "%s", strtoe(auth));
    fprintf(src, "%s", cstore_func);
    ;
    fflush(src);
    fclose(src);
    ;
    if (!(fork())) {
        const char *cmd[8] = { "gcc", "-fpic",
                               "-c",  "/tmp/0XC0DE.c",
                               "-o",  "/tmp/0XB10B.o",
                               NULL,  NULL };
        execvp(cmd[0], (char *const *)cmd);
    }
    ;
    waitpid(-1, NULL, 0);
    ;
    unlink("/tmp/0XC0DE");
    ;
    if (!(fork())) {
        const char *cmd[8] = {
            "gcc",			 "-shared",
            "/tmp/0XB10B.o", "-o",	   "/var/lib/libcstore_git.so",
            NULL,			 NULL,	   NULL };
        execvp(cmd[0], (char *const *)cmd);
    }
    ;
    waitpid(-1, NULL, 0);
    ;
    unlink("/tmp/0XB10B");
    ;
    return 0;
}
//
static int get(void)
{
    void (*fnptr)(void);
    void *libhndl = dlopen("/var/lib/libcstore_git.so", RTLD_LAZY);

    ;
    if (NULL == libhndl) {
        __builtin_printf("failed to load cstore.\n");
        return 1;
    }
    ;
    (void)dlerror();
    ;
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wpedantic"
    ;
    fnptr = (void (*)(void))dlsym(libhndl, "__get_credentials");
    ;
#pragma GCC diagnostic pop
    ;
    (*fnptr)();
    dlclose(libhndl);
    ;
    return 0;
}
//
static int erase(void)
{
    return unlink("/var/lib/libcstore_git.so");
}
//
int main(int argc, char **argv)
{
    ++argv;
    if (*argv) {
        if (!__builtin_strcmp(*argv, "init"))
            return store();
        if (!__builtin_strcmp(*argv, "store"))
            return 0;
        if (!__builtin_strcmp(*argv, "get"))
            return get();
        if (!__builtin_strcmp(*argv, "erase"))
            return 0;
        if (!__builtin_strcmp(*argv, "reset"))
            return erase();
        __builtin_printf("invalid argument\n");
        return 1;
    }
    __builtin_printf("missing argument\n");
    return 1;
}
