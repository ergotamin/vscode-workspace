//-------------------------------------
// (c) 2018 MIT License Marcel Bobolz
// <mailto:ergotamin.source@gmail.com>
//-------------------------------------
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <termios.h>
#include <netinet/in.h>
#include <openssl/opensslv.h>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include <openssl/pem.h>
#include <openssl/engine.h>
#include <openssl/cms.h>

//
#include <x509.crt.h>
#include <sha512.key.h>

//
struct module_signature {
    unsigned char	algo;       /* Public-key crypto algorithm [0] */
    unsigned char	hash;       /* Digest algorithm [0] */
    unsigned char	id_type;    /* Key identifier type [2] */
    unsigned char	signer_len; /* Length of signer's name [0] */
    unsigned char	key_id_len; /* Length of key identifier [0] */
    unsigned char	__pad[3];
    unsigned int	sig_len;    /* Length of signature data */
};

//
#define CMS_PREPARE_FLAGS (0X50C2U)
#define CMS_SIGNING_FLAGS (0X0382U)
#define CMS_SUCCESS_FLAGS (0X0082U)
#define HASH_ALGO "sha512"
#define STDIN_FD  (1)

//
extern const char *__progname;
static char magic_number[] = "~Module signature appended~\n";

// ```
// format...
// ```
static void format(void)
{
    __builtin_printf("Usage:\n"
                     "\t%s 'module.ko'\n\n"
                     "\ttries to sign 'module.ko' with\n"
                     "\tthe imported key&cert.\n"
                     "\ton success 'module_signed.ko'\n"
                     "\twill be created.\n\n"
                     "\tif the key is password-protected\n"
                     "\tone may store the password in\n"
                     "\tthe environment.\n"
                     "\te.g.:\n"
                     "\texport MODULE_SIGN_PIN='password'\n",
                     __progname);
    exit(2);
}

// *`check environment variable for keyvalue`*
static void *get_pin(void)
{
    return (void *)__builtin_strdup(getenv("MODULE_SIGN_PIN"));
}

// ```
// set_pin...
// ```
static int set_pin(char *buf, int max_len, int rwflag __attribute__((unused)), void *pin_ptr)
{
    if (NULL != pin_ptr) {
        int len = (int)__builtin_strlen((const char *)pin_ptr);
        if (max_len > len) {
            buf = __builtin_strdup((const char *)pin_ptr);
            return len;
        }
    }
    return 0;
}

// ```
// read_private_key...
// ```
static EVP_PKEY *load_sha512_key(void *pin)
{
    BIO *sha512_bio;
    EVP_PKEY *sha512_key;

    sha512_bio = BIO_new_mem_buf((const void *)KEY, KEYSIZE);
    sha512_key = PEM_read_bio_PrivateKey(sha512_bio, NULL, set_pin, pin);

    BIO_free(sha512_bio);

    return sha512_key;
}

// ```
// read_x509...
// ```
static X509 *load_x509_crt(void *pin)
{
    X509 *x509_crt;
    BIO *x509_bio;

    x509_bio = BIO_new_mem_buf((const void *)CRT, CRTSIZE);
    x509_crt = PEM_read_bio_X509(x509_bio, NULL, set_pin, pin);

    BIO_free(x509_bio);

    return x509_crt;
}

// ```
// main...
// ```
int main(int argc, char **argv)
{
    if (argc < 2 || argc > 4)
        format();

    //
    unsigned int ret = 1;
    static void *pin = NULL;
    char *dst_modfile = NULL;
    char *src_modfile = NULL;
    unsigned char buf[(1 << 12)];
    unsigned long dst_nbytes = 0;
    unsigned long sig_nbytes = 0;

    //
    struct module_signature sig_info = { .id_type = 2 };
    CMS_ContentInfo *cms_sign = NULL;
    const EVP_MD *hash_algo;
    EVP_PKEY *key;
    BIO *src_bio;
    BIO *dst_bio;
    X509 *crt;

    src_modfile = __builtin_strdup(*(argv + 1));

    if ((argc << 1) & argc) {
        dst_modfile = __builtin_strdup(*(argv + 2));
    } else {
        char *tr;
        dst_modfile = __builtin_strdup(src_modfile);
        tr = __builtin_strrchr(dst_modfile, '.');
        *tr = '\0';
        __builtin_strcat(dst_modfile, "_signed.ko");
    }

    //
    OpenSSL_add_all_algorithms();
    ERR_load_crypto_strings();
    ERR_clear_error();

    //
    pin = get_pin();
    key = load_sha512_key(pin);
    crt = load_x509_crt(pin);

    //
    OpenSSL_add_all_digests();
    src_bio = BIO_new_file(src_modfile, "rb");
    hash_algo = EVP_get_digestbyname(HASH_ALGO);

    //
    cms_sign = CMS_sign(NULL, NULL, NULL, NULL, CMS_PREPARE_FLAGS);
    CMS_add1_signer(cms_sign, crt, key, hash_algo, CMS_SIGNING_FLAGS);
    CMS_final(cms_sign, src_bio, NULL, CMS_SUCCESS_FLAGS);

    //
    BIO_reset(src_bio);

    if ((dst_bio = BIO_new_file(dst_modfile, "wb"))) {
        //
        dst_nbytes = BIO_read(src_bio, (void *)buf, 1 << 12);
        //
        for (; dst_nbytes > 0; dst_nbytes = BIO_read(src_bio, (void *)buf, 1 << 12))
            BIO_write(dst_bio, (const void *)buf, dst_nbytes);
        //
        dst_nbytes = BIO_number_written(dst_bio);
        BIO_free(src_bio);

        if (0 < i2d_CMS_bio_stream(dst_bio, cms_sign, NULL, 0)) {
            //
            sig_nbytes = BIO_number_written(dst_bio) - dst_nbytes;
            sig_info.sig_len = htonl(sig_nbytes);
            //
            BIO_write(dst_bio, &sig_info, sizeof(sig_info));
            BIO_write(dst_bio, magic_number, sizeof(magic_number) - 1);
            BIO_free(dst_bio);
            //
            __builtin_printf("\x1b[32m%s\x1b(B\x1b[m\n", "\u2714");
            ret = 0;
        } else {
            __builtin_printf("\x1b[91m%s\x1b(B\x1b[m\n", "\u2718");
            ret = 1;
        }
    }

    //
    __builtin_free(pin);

    if (!(argc ^ 3) && !ret)
        rename(dst_modfile, src_modfile);

    return ret;
}
