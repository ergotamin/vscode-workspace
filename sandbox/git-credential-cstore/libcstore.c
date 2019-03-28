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
extern const char *__progname;
//
unsigned int get_opt(const char *arg, int num, ...)
{
    va_list args;
    int r = -1;
    char *def = NULL;
    unsigned int opt = 0;

    va_start(args, num);
    ;
    for (--num; 0 <= num; num--) {
        ++opt;
        def = __builtin_strdup(va_arg(args, const char *));

        r = __builtin_strcmp(arg, def);
        __builtin_free((void *)def);
        def = NULL;

        if (0 == r)
            break;
    }
    ;
    va_end(args);
    ;
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
        perror("BN_set_word() failed.\n");
        BN_free(bignum);
        return 1;
    }

    RSA *rsa = RSA_new();
    if (1 != RSA_generate_key_ex(rsa, BITS, bignum, NULL)) {
        perror("RSA_generate_key_ex() failed.\n");
        BN_free(bignum);
        RSA_free(rsa);
        return 1;
    }

    BIO *bio_pub = BIO_new_file(cstore_key, "w+");
    if (1 != PEM_write_bio_RSAPublicKey(bio_pub, rsa)) {
        perror("PEM_write_bio_RSAPublicKey() failed.\n");
        BIO_free(bio_pub);
        BN_free(bignum);
        RSA_free(rsa);
        return 1;
    }

    cstore_key[__builtin_strlen(cstore_key) - 4] = '\0';

    BIO *bio_prv = BIO_new_file(cstore_key, "w+");
    if (1 != PEM_write_bio_RSAPrivateKey(bio_prv, rsa, NULL, NULL, 0, NULL, NULL)) {
        perror("PEM_write_bio_RSAPrivateKey() failed.\n");
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
    char enc[BITS + 256];
    char cstore_keyfile[256];
    char cstore_encfile[256];
    char *cstore_dir = __builtin_strdup(getenv("HOME"));
    unsigned long plain_len = __builtin_strlen(plain) + 1;

    ;
    __builtin_strcat(cstore_dir, "/.cstore");
    ;
    if (0 != access(cstore_dir, F_OK)) {
        fprintf(stderr, "could not find \"%s\" directory.\n"    \
                "use '%s init' to initialize required files.\n" \
                "( or create and import them manually. )\n",
                cstore_dir, __progname);
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
        fprintf(stderr, "could not open \"%s\" keyfile.\n"      \
                "use '%s init' to initialize required files.\n" \
                "( or create and import them manually. )\n",
                cstore_keyfile, __progname);
        return 2;
    }
    ;
    RSA *pub_key = PEM_read_bio_RSAPublicKey(key_bio, NULL, NULL, NULL);
    if (NULL == pub_key) {
        fprintf(stderr, "could not read \"%s\" keyfile.\n"         \
                "use '%s init' to re-initialize required files.\n" \
                "( or create and import them manually. )\n",
                cstore_keyfile, __progname);
        return 3;
    }
    ;
    BIO_free(key_bio);
    ;
    bzero((void *)enc, BITS + 256);
    int encrypted_len = RSA_public_encrypt(plain_len, plain, enc, pub_key, RSA_PKCS1_PADDING);
    if (-1 == encrypted_len) {
        fprintf(stderr, "could not encrypt data with \"%s\" key.\n" \
                "use '%s init' to re-initialize required files.\n"  \
                "( or create and import them manually. )\n",
                cstore_keyfile, __progname);
        return 4;
    }
    ;
    FILE *enc_fp = fopen(cstore_encfile, "w+");
    if (NULL == enc_fp) {
        fprintf(stderr, "could not create \"%s\" file.\n"
                "you make have to check permissions.\n",
                cstore_encfile);
        return 5;
    } else {
        fwrite(enc, encrypted_len, 1, enc_fp);
        fflush(enc_fp);
        fclose(enc_fp);
    }
    ;
    if (0 == access(cstore_encfile, F_OK)) {
        perror("encryption succeeded.\n");
        return 0;
    } else {
        fprintf(stderr, "could not access \"%s\" file.\n"
                "something went wrong during encryption.\n",
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
        fprintf(stderr, "could not find \"%s\" keyfile.\n"      \
                "use '%s init' to initialize required files.\n" \
                "( or create and import them manually. )\n",
                key_path, __progname);
        return 1;
    }

    char *enc = NULL;
    char enc_path[256];
    char dec[256] = { 0 };
    unsigned long enc_size = 0;
    char *cstore_dir = __builtin_strdup(getenv("HOME"));

    ;
    __builtin_strcat(cstore_dir, "/.cstore");
    ;
    if (0 != access(cstore_dir, F_OK)) {
        fprintf(stderr, "could not find \"%s\" directory.\n"    \
                "use '%s init' to initialize required files.\n" \
                "( or create and import them manually. )\n",
                cstore_dir, __progname);
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
        fprintf(stderr, "could not open \"%s\" credential-file.\n" \
                "use '%s init' to initialize required files.\n"    \
                "( or create and import them manually. )\n",
                enc_path, __progname);
        return 2;
    }
    ;
    fseek(enc_fp, 0, SEEK_END);
    enc_size = ftell(enc_fp);
    fseek(enc_fp, 0, SEEK_SET);
    enc = (char *)__builtin_calloc(enc_size, sizeof(char));
    fread(enc, enc_size, 1, enc_fp);
    fflush(enc_fp);
    fclose(enc_fp);
    ;
    FILE *key_fp = fopen(key_path, "r");
    if (NULL == key_fp) {
        fprintf(stderr, "could not open \"%s\" keyfile.\n"      \
                "use '%s init' to initialize required files.\n" \
                "( or create and import them manually. )\n",
                key_path, __progname);
        return 3;
    }
    ;
    RSA *prv_key = PEM_read_RSAPrivateKey(key_fp, NULL, NULL, NULL);
    if (NULL == prv_key) {
        fprintf(stderr, "could not read \"%s\" keyfile.\n"      \
                "use '%s init' to initialize required files.\n" \
                "( or create and import them manually. )\n",
                key_fp, __progname);
        return 4;
    }
    ;
    bzero((void *)dec, 256);
    int decrypted_len = RSA_private_decrypt(enc_size, enc, dec, prv_key, RSA_PKCS1_PADDING);
    if (-1 == decrypted_len) {
        fprintf(stderr, "could not decrypt data with \"%s\" key.\n" \
                "use '%s init' to re-initialize required files.\n"  \
                "( or create and import them manually. )\n",
                key_path, __progname);
        return 5;
    }
    ;
    fflush(key_fp);
    fclose(key_fp);
    ;
    char *dec_path = strdup("/tmp/XXXXXX");
    if (NULL == mktemp(dec_path)) {
        fprintf(stderr, "could not create temporary file.\n"
                "you may have to check permissions for '/tmp'.\n");
        return 6;
    }
    ;
    FILE *dec_fp = fopen(dec_path, "w+");
    if (NULL == dec_fp) {
        fprintf(stderr, "could not create temporary file.\n"
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
        fprintf(stderr, "could not access temporary file.\n"
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
#if defined(__cplusplus)
}
#endif
