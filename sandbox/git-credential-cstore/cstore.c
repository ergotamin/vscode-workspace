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
#include <unistd.h>
#include <string.h>
//
#include <dirent.h>
#include <fnmatch.h>
#include <sys/stat.h>
//
#include <openssl/evp.h>
#include <openssl/rsa.h>
#include <openssl/pem.h>
//
#include "cstore.h"
//
char *get_config_dir(void)
{
    char *cdir = NULL;

    if (NULL == (cdir = getenv("XDG_CONFIG_HOME"))) {
        cdir = getenv("HOME");
        __builtin_strcat(cdir, "/.config/cstore\0");
    } else {
        __builtin_strcat(cdir, "/cstore\0");
    }

    if (0 != access(cstore_dir, F_OK))
        mkdir(cstore_dir, 0755);

    return __builtin_strdup(cdir);
}
//
void free_credentials(void)
{
    __builtin_free((void *)__cstore->username);
    __builtin_free((void *)__cstore->password);
    __builtin_free((void *)__cstore);
    __cstore = NULL;
}
//
unsigned int generate_key(void)
{
    char cstore_key[512];
    char *cstore_dir = get_config_dir();

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
unsigned int encrypt_credentials(const char *plain)
{
    char cstore_keyfile[256];
    char cstore_encfile[256];
    char *cstore_dir = get_config_dir();
    unsigned char *enc = __builtin_alloca(BITS + 256);
    unsigned long plain_len = __builtin_strlen(plain) + 1;


    __builtin_sprintf(cstore_keyfile, "%s%s", cstore_dir, "/id_rsa.pub");
    __builtin_sprintf(cstore_encfile, "%s%s", cstore_dir, "/data")
    __builtin_free((void *)cstore_dir);

    BIO *key_bio = BIO_new_file(cstore_keyfile, "r");

    if (NULL == key_bio) {
        error("could not open \"%s\" keyfile.\n",
              cstore_keyfile);
        return 2;
    }

    RSA *pub_key = PEM_read_bio_RSAPublicKey(key_bio, NULL, NULL, NULL);

    if (NULL == pub_key) {
        error("could not read \"%s\" keyfile.\n",
              cstore_keyfile);
        return 3;
    }

    BIO_free(key_bio);

    bzero((void *)enc, BITS + 256);
    int encrypted_len =
        RSA_public_encrypt(plain_len, (const unsigned char *)plain,
                           enc, pub_key, RSA_PKCS1_PADDING);

    if (-1 == encrypted_len) {
        error("could not encrypt data with \"%s\" key.\n",
              cstore_keyfile);
        return 4;
    }

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

    if (0 == access(cstore_encfile, F_OK)) {
        __builtin_printf("encryption succeeded.\n");
        return 0;
    } else {
        error("could not access \"%s\" file.\n",
              cstore_encfile);
        return 6;
    }
}
//
unsigned int decrypt_credentials(const char *key_path)
{
    if (0 != access(key_path, F_OK)) {
        error("could not find \"%s\" keyfile.\n",
              key_path);
        return 1;
    }

    unsigned char *enc = NULL;
    unsigned char *dec = NULL;
    unsigned long enc_size = 0;
    char *cstore_dir = get_config_dir();
    char *enc_path = (char *)__builtin_alloca(512);

    __builtin_sprintf(enc_path, "%s%s", cstore_dir, "/data")
    __builtin_free((void *)cstore_dir);

    FILE *enc_fp = fopen(enc_path, "r");

    if (NULL == enc_fp) {
        error("could not open \"%s\" credential-file.\n",
              enc_path);
        return 2;
    }

    do {
        fseek(enc_fp, 0, SEEK_END);
        enc_size = ftell(enc_fp);
        fseek(enc_fp, 0, SEEK_SET);
        enc = (unsigned char *)__builtin_calloc(enc_size, sizeof(unsigned char));
        fread(enc, enc_size, 1, enc_fp);
        fflush(enc_fp);
        fclose(enc_fp);
    } while (NULL);

    FILE *key_fp = fopen(key_path, "r");

    if (NULL == key_fp) {
        error("could not open \"%s\" keyfile.\n",
              key_path);
        return 3;
    }

    RSA *prv_key = PEM_read_RSAPrivateKey(key_fp, NULL, NULL, NULL);

    if (NULL == prv_key) {
        error("could not read \"%s\" keyfile.\n",
              key_path);
        return 4;
    }

    dec = (unsigned char *)__builtin_calloc(256, sizeof(unsigned char));
    bzero((void *)dec, 256);

    int decrypted_len = RSA_private_decrypt(enc_size, enc, dec, prv_key, RSA_PKCS1_PADDING);

    if (-1 == decrypted_len) {
        error("could not decrypt data with \"%s\" key.\n",
              key_path);
        return 5;
    }

    fflush(key_fp);
    fclose(key_fp);

    char *dec_path = strdup("/tmp/XXXXXX");

    if (-1 == mkstemp(dec_path)) {
        error("could not create temporary file.\n"
              "you may have to check permissions for '/tmp'.\n");
        return 6;
    }

    FILE *dec_fp = fopen(dec_path, "w+");

    if (NULL == dec_fp) {
        error("could not create temporary file.\n"
              "you may have to check permissions for '/tmp'.\n");
        return 7;
    }

    do {
        fwrite(dec, decrypted_len, 1, dec_fp);
        fflush(dec_fp);
        fclose(dec_fp);
    } while (NULL);

    if (0 == access(dec_path, F_OK)) {
        do {
            if (NULL == (dec_fp = fopen(dec_path, "r")))
                break;

            __cstore = (cstore_t *)__builtin_calloc(1, sizeof(cstore_t));
            __cstore->username = fgets(__builtin_calloc(1, 256), 256, dec_fp);
            __cstore->password = fgets(__builtin_calloc(1, 256), 256, dec_fp);

            fflush(dec_fp);
            fclose(dec_fp);
            unlink(dec_path);

            return 0;
        } while (NULL);
    }

    unlink(dec_path);
    error("could not access temporary file.\n"
          "something went wrong during decryption.\n");
    return 8;
}
//
static int store_credentials(void)
{
    char user[256];
    char auth[256];
    char credentials[720];

    __builtin_printf("\nusername=");
    fgets(user, 256, stdin);
    fflush(stdin);

    __builtin_printf("\npassword=");
    fgets(auth, 256, stdin);
    fflush(stdin);

    __builtin_sprintf(credentials, "username=%spassword=%s", user, auth);

    return encrypt_credentials(credentials);
}
//
unsigned int reset_credentials(void)
{
    glob_t fglob;
    char *cstore_dir = get_config_dir();

    __builtin_strcat(cstore_dir, "/*\0");
    glob(cstore_dir, GLOB_NOSORT, NULL, &fglob);

    while (fglob.gl_pathc--)
        unlink(fglob.gl_pathv[fglob.gl_pathc]);

    __builtin_printf("removed keys and credential file.\n");

    return 0;
}
//
static void print_credentials(const char *key_path)
{
    if (0 == decrypt_credentials(key_path)) {
        fprintf(stdout, "%s", __cstore->username);
        fprintf(stdout, "%s", __cstore->password);
        free_credentials();
    } else {
        error("decrypt_credentials(\"%s\") failed.\n",
              key_path);
    }
}
//
#if defined(__cplusplus)
}
#endif
