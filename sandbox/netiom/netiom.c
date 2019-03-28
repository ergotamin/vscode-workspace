// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <pthread.h>
#include <sys/types.h>
#include <sys/ioctl.h>

//
struct netsta_t {
    unsigned long	bytes_in;
    unsigned long	bytes_out;
};

//
static const char *sysdir = "/sys/class/net/";
static const char *stpath = "/operstate";
static const char *rxpath = "/statistics/rx_bytes";
static const char *txpath = "/statistics/tx_bytes";

//
static struct netsta_t *netsta;

//
unsigned int term_width(void);
unsigned long abs_ul(long v1, long v2);
void check_device(const char *dnam);
char *_read_data(void *buf, unsigned long le, const char *fpath);
void get_stats(const char *rxfile, const char *txfile);

#define DEL \
    "\x1b[1K"
#define CUU \
    "\x1b[A"
//
#define __(fn) \
    __builtin_ ## fn
#define read_data(size, fpath) \
    _read_data(__builtin_alloca(size), size, fpath)
#define MARK() \
    printf("%s at line %s\n", __FUNCTION__, __LINE__)


//
unsigned int term_width(void)
{
    struct winsize wd;

    ioctl(0, TIOCGWINSZ, &wd);
    return wd.ws_col;
}

//
unsigned long abs_ul(long v1, long v2)
{
    return (unsigned long)((-1) * (v1 - v2));
}

//
void check_device(const char *dnam)
{
    char devp[256];

    __(memset)(devp, 0, 256);
    __(sprintf)(devp, "%s%s", sysdir, dnam);

    if (0 != access(devp, F_OK))
        __(exit)(1);

    __(strcat)(devp, stpath);

    char *state = read_data(3, devp);

    state[2] = '\0';

    if (0 != __(strcmp)("up", state))
        __(exit)(1);

    return;
}

//
char *_read_data(void *buf, unsigned long le, const char *fpath)
{
    FILE *file = fopen(fpath, "rb");
    char *data = fgets((char *)buf, le, file);

    fflush(file);
    fclose(file);
    return data;
}

//
void get_stats(const char *rxfile, const char *txfile)
{
    long rx_v1 = strtol(read_data(32, rxfile), NULL, 10);
    long tx_v1 = strtol(read_data(32, txfile), NULL, 10);

    ;
    usleep(990000);
    ;

    long rx_v2 = strtol(read_data(32, rxfile), NULL, 10);
    long tx_v2 = strtol(read_data(32, txfile), NULL, 10);

    netsta->bytes_out = abs_ul(rx_v1, rx_v2);
    netsta->bytes_in = abs_ul(tx_v1, tx_v2);
}

//
int main(int argc, char **argv)
{
    --argc;
    argv++;
    if (1 == argc) {
        ;
        check_device(*argv);
        ;
        char rxfp[256];
        char txfp[256];
        ;
        __(memset)(rxfp, 0, 256);
        __(memset)(txfp, 0, 256);
        ;
        __(sprintf)(rxfp, "%s%s%s", sysdir, *argv, rxpath);
        __(sprintf)(txfp, "%s%s%s", sysdir, *argv, txpath);
        ;
        netsta = (struct netsta_t *)__(calloc)(1, (sizeof(struct netsta_t)));
        ;
        for (; !(0);) {
            ;
            get_stats(rxfp, txfp);
            ;
            __(printf)(
                "Down: %Ld Bytes/s" "\n" \
                "  Up: %Ld Bytes/s" "\n",
                netsta->bytes_in,
                netsta->bytes_out
                );
            __(printf)(CUU "\t\t\t\t" DEL "\r");
            __(printf)(CUU "\t\t\t\t" DEL "\r");
        }
        ;

        return 0;
    }
    ;
    return 1;
}
