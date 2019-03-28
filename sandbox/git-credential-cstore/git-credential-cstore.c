//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
//
extern const char *__progname;
//
extern unsigned int reset_cstore(void);
extern unsigned int generate_keys(void);
extern unsigned int get_opt(const char *arg, int num, ...);
extern unsigned int store_credentials(const char *plain);
extern unsigned int get_credentials(const char *key_path);
//
static int store(void)
{
    char user[128];
    char auth[128];
    char credentials[256];

    ;
    __builtin_printf("\nusername=");
    fgets(user, 128, stdin);
    fflush(stdin);
    ;
    __builtin_printf("\npassword=");
    fgets(auth, 128, stdin);
    fflush(stdin);
    ;
    __builtin_sprintf(credentials, "username=%spassword=%s", user, auth);
    ;
    return store_credentials(credentials);
}
//
static int get(const char *key_path)
{
    return get_credentials(key_path);
}
//
static int erase(void)
{
    return reset_cstore();
}
//
int main(int argc, char **argv)
{
    ++argv;
    if (*argv) {
        if (!__builtin_strcmp(*argv, "init"))
            return generate_keys();
        if (!__builtin_strcmp(*argv, "store"))
            return store();
        if (!__builtin_strcmp(*argv, "get")) {
            char key_path[256];
            __builtin_sprintf(key_path, "%s", getenv("HOME"));
            __builtin_strcat(key_path, "/.cstore/id_rsa\0");
            return get(key_path);
        }
        if (!__builtin_strcmp(*argv, "-pkey")) {
            argv++;
            const char *key_path = strdup(*argv);
            argv++;
            if (!__builtin_strcmp(*argv, "get"))
                return get(key_path);
        }
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
