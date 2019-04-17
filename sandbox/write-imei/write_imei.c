// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
//       for MTK6735 android devices:
//   utility to fix nvram error which may
//   be caused after flashing a new rom.
//        (requires root-privileges!)
//
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
//
extern const char *__progname;
//
static void expand(unsigned long imei, unsigned char digits[15]);
static unsigned int luhn_algo(unsigned char digits[15]);
static unsigned int verify_imei(unsigned long imei);
//
static void expand(unsigned long imei, unsigned char digits[15])
{
    digits[0] = 0;
    int j = 14;

    while (imei) {
        digits[j] = imei % 10;
        imei /= 10;
        j--;
    }
}
//
static unsigned int luhn_algo(unsigned char digits[15])
{
    int j, buf, sum = 0;

    for (j = 0; j <= 12; j += 2)
        sum += digits[j];


    for (j = 1; j <= 13; j += 2) {
        buf = digits[j] * 2;
        if (buf >= 10)
            buf = 1 + buf % 10;
        sum += buf;
    }

    int OwO = sum % 10;
    if (OwO)
        return 10 - OwO;
    else
        return 0;
}
//
static unsigned int verify_imei(unsigned long imei)
{
    unsigned char digits[15];

    expand(imei, digits);

    return luhn_algo(digits) == digits[14];
}
//
int main(int argc, char *argv[])
{
    --argc;
    FILE *fp = NULL;
    unsigned int n = 1;
    static char imei_str[16];
    unsigned long imei = 012345675432101UL;
    const char *nvram_dir = "/data/nvram/md/NVRAM/NVD_IMEI/";
    const char *nvram_file = "MP0B_001";


    if (argc < 1 || (strlen(argv[n]) != 15)) {
        printf("usage:\n"
               "\t%s [IMEI]\n\n"
               "\t   a valid IMEI is 15 digits long and\n"
               "\t   usually printed on the back of a phone.\n",
               __progname);
    } else {
        snprintf(imei_str, 16, "%s", argv[1]);

        imei = strtoull(imei_str, NULL, 10);

        printf("\x1b[1m" "IMEI : " "\x1b(B\x1b[m"
               "\x1b[3m" "%015lu" "\x1b(B\x1b[m [", imei);

        if (verify_imei(imei)) {
            printf("\x1b[32m" "VERIFIED" "\x1b(B\x1b[m]\n");
        } else {
            printf("\x1b[31m" "INVALID" "\x1b(B\x1b[m]\n");
            return 1;
        }

        if (0U < geteuid()) {
            if (0 > setuid(0U)) {
                printf("\x1b[31m" "could´nt gain root-privileges" "\x1b(B\x1b[m!\n");
                return 1;
            }
        }

        if (0 > access(nvram_dir, F_OK)) {
            printf("\x1b[31m" "could´nt access directory at " "\x1b(B\x1b[m]`%s'!\n",
                   nvram_dir);
            return 1;
        }

        if (0 > chdir(nvram_dir)) {
            printf("\x1b[31m" "could´nt change directory to " "\x1b(B\x1b[m]`%s'!\n",
                   nvram_dir);
            return 1;
        }

        fp = fopen(nvram_file, "w+");
        fwrite(imei_str, 1, sizeof(imei_str), fp);
        fflush(fp);
        fclose(fp);

        chmod(nvram_file, 00660);           // --RW-RW----
        chown(nvram_file, 1000U, 1001U);    // 1000 == system, 1001 == radio

        return 0;
    }
    return 1;
}
