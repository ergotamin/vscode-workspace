// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
#include <syswatch.h>
//
struct netsta_t *netsta;
//
long abs_l(long value);
char *_read_data(void *buf, unsigned long le, const char *fpath);
//
#define read_data(size, fpath)  _read_data(__builtin_alloca(size), size, fpath)
//
long abs_l(long value)
{
    return value < 0 ? -value : value;
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
void __attribute__((visibility("internal")))
net_stats(const char *rxfile, const char *txfile)
{
    long rx_v1 = strtol(read_data(32, rxfile), (char **)NULL, 0);
    long tx_v1 = strtol(read_data(32, txfile), (char **)NULL, 0);

    ;
    sleep(1);
    ;

    long rx_v2 = strtol(read_data(32, rxfile), (char **)NULL, 0);
    long tx_v2 = strtol(read_data(32, txfile), (char **)NULL, 0);
    //
    netsta->fmt_in = 1U;
    netsta->fmt_out = 1U;
    //
    netsta->bytes_in = (double)((abs_l(tx_v2 - tx_v1) * 8) / 1024.0);
    netsta->bytes_out = (double)((abs_l(rx_v2 - rx_v1) * 8) / 1024.0);
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
// UP   -> bytes_in  & fmt_in  FORMAT:
// DOWN -> bytes_out & fmt_out        "%s %.2f %s/s"
void __net_stats(void *data)
{
    char rxfp[256];
    char txfp[256];
    char stats[256];

    __builtin_memset(rxfp, 0, 256);
    __builtin_memset(txfp, 0, 256);

    __builtin_sprintf(rxfp, "%s%s%s",
                      "/sys/class/net/", (char *)data,
                      "/statistics/rx_bytes");

    __builtin_sprintf(txfp, "%s%s%s",
                      "/sys/class/net/", (char *)data,
                      "/statistics/tx_bytes");

    netsta = (struct netsta_t *)__builtin_calloc(1, (sizeof(struct netsta_t)));

    for (; !(0);) {
        net_stats(rxfp, txfp);

        __builtin_sprintf(stats, "%s %.2f %s/s | %s %.2f %s/s",
                          "UP", netsta->bytes_in,
                          netsta->fmt_in == 2 ? "MB" : "KB",
                          "DOWN", netsta->bytes_out,
                          netsta->fmt_out == 2 ? "MB" : "KB");

        if (xosd_is_onscreen(osd))
            xosd_destroy(osd);

        x11_print(stats, 2, H_OFF, V_OFF);

        __builtin_memset(stats, 0, 128);
    }
    return;
}
