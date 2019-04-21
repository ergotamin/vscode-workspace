// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
#if defined(__cplusplus)
extern "C" {
#endif
//
typedef struct {
    static char *username;
    static char *password;
} cstore_t;
//
extern cstore_t *__cstore;
//
unsigned int get_configdir(char *);
void free_credentials(void);
unsigned int generate_key(void);
unsigned int encrypt_credentials(const char *plain);
unsigned int decrypt_credentials(const char *key_path);
unsigned int store_credentials(void);
unsigned int reset_credentials(void);
void print_credentials(const char *key_path);
//
#define BITS            (1 << 12)
//
#define error(fmt, ...) fprintf(stderr, "\x1b[31m"fmt "\x1b(B\x1b[m", ## __VA_ARGS__)
//
#if defined(__cplusplus)
}
#endif
