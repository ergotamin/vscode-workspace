//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
#if defined(__cplusplus)
extern "C" {
#endif
//
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <unistd.h>
#include <string.h>
#include <sys/stat.h>
//
#include <openssl/evp.h>
#include <openssl/rsa.h>
#include <openssl/pem.h>
//
#define BITS   (1 << 12)
//
#define error(fmt, ...) fprintf(stderr, fmt, ## __VA_ARGS__)
//
extern const char *__progname;
//
unsigned int reset_cstore(void);
unsigned int generate_keys(void);
unsigned int store_credentials(const char *plain);
unsigned int get_credentials(const char *key_path);
unsigned int get_opt(const char *arg, int num, ...);
//
unsigned int get_opt(const char *arg, int num, ...)
{
    int r = -1;
    va_list args;
    char *def = NULL;
    unsigned int opt = 0;

    va_start(args, num);
    ;
    for (--num; 0 <= num; num--) {
        ++opt;
        ;
        def = __builtin_strdup(va_arg(args, const char *));
        r = __builtin_strcmp(arg, def);
        __builtin_free((void *)def);
        ;
        def = NULL;
        ;
        if (0 == r)
            break;
    }
    ;
    va_end(args);

    if (num == -1)
        return (unsigned int)num;
    else
        return opt;
}
//
unsigned int generate_keys(void)
{
    char cstore_key[256];
    char *cstore_dir = __builtin_strdup(getenv("HOME"));

    __builtin_strcat(cstore_dir, "/.cstore");

    if (0 != access(cstore_dir, F_OK))
        mkdir(cstore_dir, 0755);

    __builtin_sprintf(cstore_key, "%s%s", cstore_dir, "/id_rsa.pub");
    __builtin_free((void *)cstore_dir);

    BIGNUM *bignum = BN_new();
    if (1 != BN_set_word(bignum, RSA_F4)) {
        error("BN_set_word() failed.\n");
        BN_free(bignum);
        return 1;
    }

    RSA *rsa = RSA_new();
    if (1 != RSA_generate_key_ex(rsa, BITS, bignum, NULL)) {
        error("RSA_generate_key_ex() failed.\n");
        BN_free(bignum);
        RSA_free(rsa);
        return 1;
    }

    BIO *bio_pub = BIO_new_file(cstore_key, "w+");
    if (1 != PEM_write_bio_RSAPublicKey(bio_pub, rsa)) {
        error("PEM_write_bio_RSAPublicKey() failed.\n");
        BIO_free(bio_pub);
        BN_free(bignum);
        RSA_free(rsa);
        return 1;
    }

    cstore_key[__builtin_strlen(cstore_key) - 4] = '\0';

    BIO *bio_prv = BIO_new_file(cstore_key, "w+");
    if (1 != PEM_write_bio_RSAPrivateKey(bio_prv, rsa, NULL, NULL, 0, NULL, NULL)) {
        error("PEM_write_bio_RSAPrivateKey() failed.\n");
        BIO_free(bio_prv);
        BIO_free(bio_pub);
        BN_free(bignum);
        RSA_free(rsa);
        return 1;
    }

    BIO_free(bio_prv);
    BIO_free(bio_pub);
    BN_free(bignum);
    RSA_free(rsa);
    return 0;
}
//
unsigned int store_credentials(const char *plain)
{
    char cstore_keyfile[256];
    char cstore_encfile[256];
    unsigned char *enc = __builtin_alloca(BITS + 256);
    char *cstore_dir = __builtin_strdup(getenv("HOME"));
    unsigned long plain_len = __builtin_strlen(plain) + 1;

    ;
    __builtin_strcat(cstore_dir, "/.cstore");
    ;
    if (0 != access(cstore_dir, F_OK)) {
        error("could not find \"%s\" directory.\n",
              cstore_dir);
        __builtin_free((void *)cstore_dir);
        return 1;
    }
    ;
    __builtin_sprintf(cstore_keyfile, "%s%s", cstore_dir, "/id_rsa.pub");
    __builtin_sprintf(cstore_encfile, "%s%s", cstore_dir, "/enc")
    ;
    __builtin_free((void *)cstore_dir);
    ;
    BIO *key_bio = BIO_new_file(cstore_keyfile, "r");
    if (NULL == key_bio) {
        error("could not open \"%s\" keyfile.\n",
              cstore_keyfile);
        return 2;
    }
    ;
    RSA *pub_key = PEM_read_bio_RSAPublicKey(key_bio, NULL, NULL, NULL);
    if (NULL == pub_key) {
        error("could not read \"%s\" keyfile.\n",
              cstore_keyfile);
        return 3;
    }
    ;
    BIO_free(key_bio);
    ;
    bzero((void *)enc, BITS + 256);
    int encrypted_len = RSA_public_encrypt(plain_len, (const unsigned char *)plain,
                                           enc, pub_key, RSA_PKCS1_PADDING);
    if (-1 == encrypted_len) {
        error("could not encrypt data with \"%s\" key.\n",
              cstore_keyfile);
        return 4;
    }
    ;
    FILE *enc_fp = fopen(cstore_encfile, "w+");
    if (NULL == enc_fp) {
        error("could not create \"%s\" file.\n",
              cstore_encfile);
        return 5;
    } else {
        fwrite(enc, encrypted_len, 1, enc_fp);
        fflush(enc_fp);
        fclose(enc_fp);
    }
    ;
    if (0 == access(cstore_encfile, F_OK)) {
        error("encryption succeeded.\n");
        return 0;
    } else {
        error("could not access \"%s\" file.\n",
              cstore_encfile);
        return 6;
    }
    ;
    return (unsigned int)-1;
}
//
unsigned int get_credentials(const char *key_path)
{
    if (0 != access(key_path, F_OK)) {
        error("could not find \"%s\" keyfile.\n",
              key_path);
        return 1;
    }

    unsigned char *enc = NULL;
    unsigned char *dec = NULL;
    char *enc_path = (char *)__builtin_alloca(512);
    unsigned long enc_size = 0;
    char *cstore_dir = __builtin_strdup(getenv("HOME"));

    ;
    __builtin_strcat(cstore_dir, "/.cstore");
    ;
    if (0 != access(cstore_dir, F_OK)) {
        error("could not find \"%s\" directory.\n",
              cstore_dir);
        __builtin_free((void *)cstore_dir);
        return 2;
    }
    ;
    __builtin_sprintf(enc_path, "%s%s", cstore_dir, "/enc")
    ;
    __builtin_free((void *)cstore_dir);
    ;
    FILE *enc_fp = fopen(enc_path, "r");
    if (NULL == enc_fp) {
        error("could not open \"%s\" credential-file.\n",
              enc_path);
        return 2;
    }
    ;
    fseek(enc_fp, 0, SEEK_END);
    enc_size = ftell(enc_fp);
    fseek(enc_fp, 0, SEEK_SET);
    enc = (unsigned char *)__builtin_calloc(enc_size, sizeof(unsigned char));
    fread(enc, enc_size, 1, enc_fp);
    fflush(enc_fp);
    fclose(enc_fp);
    ;
    FILE *key_fp = fopen(key_path, "r");
    if (NULL == key_fp) {
        error("could not open \"%s\" keyfile.\n",
              key_path);
        return 3;
    }
    ;
    RSA *prv_key = PEM_read_RSAPrivateKey(key_fp, NULL, NULL, NULL);
    if (NULL == prv_key) {
        error("could not read \"%s\" keyfile.\n",
              key_path);
        return 4;
    }
    ;
    dec = (unsigned char *)__builtin_calloc(256, sizeof(unsigned char));
    bzero((void *)dec, 256);
    int decrypted_len = RSA_private_decrypt(enc_size, enc, dec, prv_key, RSA_PKCS1_PADDING);
    if (-1 == decrypted_len) {
        error("could not decrypt data with \"%s\" key.\n",
              key_path);
        return 5;
    }
    ;
    fflush(key_fp);
    fclose(key_fp);
    ;
    char *dec_path = strdup("/tmp/XXXXXX");
    if (-1 == mkstemp(dec_path)) {
        error("could not create temporary file.\n"
              "you may have to check permissions for '/tmp'.\n");
        return 6;
    }
    ;
    FILE *dec_fp = fopen(dec_path, "w+");
    if (NULL == dec_fp) {
        error("could not create temporary file.\n"
              "you may have to check permissions for '/tmp'.\n");
        return 7;
    } else {
        fwrite(dec, decrypted_len, 1, dec_fp);
        fflush(dec_fp);
        fclose(dec_fp);
    }
    ;
    if (0 == access(dec_path, F_OK)) {
        dec_fp = fopen(dec_path, "r");
        fprintf(stdout, "%s", fgets(alloca(256), 256, dec_fp));
        fprintf(stdout, "%s", fgets(alloca(256), 256, dec_fp));
        fflush(dec_fp);
        fclose(dec_fp);
        unlink(dec_path);
        return 0;
    } else {
        unlink(dec_path);
        error("could not access temporary file.\n"
              "something went wrong during decryption.\n");
        return 8;
    }
    ;
    return (unsigned int)-1;
}
//
unsigned int reset_cstore(void)
{
    /* to be added ... */
    return 0;
}
//
static int store(void)
{
    char user[128];
    char auth[128];
    char credentials[512];

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
int main(int argc __attribute__((unused)), char **argv)
{
    ++argv;
    if (*argv) {
        char *key_path = (char *)__builtin_alloca(256UL);
        switch (get_opt(*argv, 6,
                        "init",
                        "set",
                        "store",
                        "get",
                        "-pkey",
                        "erase",
                        "reset")) {
        case 1:
            return generate_keys();

        case 2:
            return store();

        case 3:
            return 0;

        case 4:
            __builtin_sprintf(key_path, "%s", getenv("HOME"));
            __builtin_strcat(key_path, "/.cstore/id_rsa\0");
            return get(key_path);

        case 5:
            argv++;
            __builtin_sprintf(key_path, "%s", *argv);
            argv++;
            if (!__builtin_strcmp(*argv, "get"))
                return get(key_path);
            else
                break;

        case 6:
            return 0;

        case 7:
            return erase();

        default:
            break;
        }
    }

    error("wrong usage\n");
    return 1;
}
//
#if defined(__cplusplus)
}
#endif
