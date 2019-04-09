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
//
struct netsta_t {
    unsigned int	fmt_in;
    unsigned int	fmt_out;
    double			bytes_in;
    double			bytes_out;
};
//
static const char *sysdir = "/sys/class/net/";
static const char *stpath = "/operstate";
static const char *rxpath = "/statistics/rx_bytes";
static const char *txpath = "/statistics/tx_bytes";
//
static struct netsta_t *netsta;
//
long abs_l(long value);
void check_device(const char *dnam);
char *_read_data(void *buf, unsigned long le, const char *fpath);
void get_stats(const char *rxfile, const char *txfile);
void set_stats(long tx_abs, long rx_abs);
//
#define DEL                     "\x1b[1K"
#define CUU                     "\x1b[A"
//
#define __(fn)                  __builtin_ ## fn
#define read_data(size, fpath)  _read_data(__builtin_alloca(size), size, fpath)
#define MARK()                  printf("%s at line %s\n", __FUNCTION__, __LINE__)
//
long abs_l(long value)
{
    return value < 0 ? -value : value;
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
    FILE *file = fopen(fpath, "r");
    char *data = fgets((char *)buf, le, file);

    fflush(file);
    fclose(file);
    return data;
}
//
void get_stats(const char *rxfile, const char *txfile)
{
    long rx_v1 = strtol(read_data(32, rxfile), (char **)NULL, 0);
    long tx_v1 = strtol(read_data(32, txfile), (char **)NULL, 0);

    ;
    sleep(1);
    ;

    long rx_v2 = strtol(read_data(32, rxfile), (char **)NULL, 0);
    long tx_v2 = strtol(read_data(32, txfile), (char **)NULL, 0);

    set_stats(abs_l(tx_v2 - tx_v1), abs_l(rx_v2 - rx_v1));
}
// [ TX == input == upload ]
// [ RX == output == download ]
void set_stats(long tx_abs, long rx_abs)
{
    //
    netsta->fmt_in = 1U;
    netsta->fmt_out = 1U;
    //
    netsta->bytes_in = (double)((tx_abs * 8) / 1024.0);
    netsta->bytes_out = (double)((rx_abs * 8) / 1024.0);
    //
    if (netsta->bytes_in > 1000.0) {
        netsta->fmt_in = 2U;
        netsta->bytes_in /= 1024.0;
    }
    //
    if (netsta->bytes_out > 1000.0) {
        netsta->fmt_out = 2U;
        netsta->bytes_out /= 1024.0;
    }
}
//
int main(int argc, char **argv)
{
    --argc;
    argv++;
    if (1 == argc) {
        check_device(*argv);

        char rxfp[256];
        char txfp[256];

        __(memset)(rxfp, 0, 256);
        __(memset)(txfp, 0, 256);

        __(sprintf)(rxfp, "%s%s%s", sysdir, *argv, rxpath);
        __(sprintf)(txfp, "%s%s%s", sysdir, *argv, txpath);

        netsta = (struct netsta_t *)__(calloc)(1, (sizeof(struct netsta_t)));

        for (; !(0);) {
            get_stats(rxfp, txfp);

            __(printf)(
                "  %s  %.2f  %s/s  " "\n" \
                "  %s  %.2f  %s/s  " "\n",
                "\u2BC5",
                netsta->bytes_in,
                netsta->fmt_in == 2
                ? "MB" : "KB",
                "\u2BC6",
                netsta->bytes_out,
                netsta->fmt_out == 2
                ? "MB" : "KB"
                );

            __(printf)(CUU "\t\t\t\t" DEL "\r");
            __(printf)(CUU "\t\t\t\t" DEL "\r");
        }

        return 0;
    }

    return 1;
}
