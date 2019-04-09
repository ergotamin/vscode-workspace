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
struct memsta_t {
    unsigned long	total;
    unsigned long	avail;
    unsigned long	used;
};
//
static const char *meminfo_path = "/proc/meminfo";
//
static struct memsta_t *memsta;
//
void get_stats(void);
//
#define DEL                     "\x1b[1K"
#define CUU                     "\x1b[A"
//
#define __(fn)                  __builtin_ ## fn
//
void get_stats(void)
{
    FILE *inf = fopen(meminfo_path, "r");
    //
    char *tr = NULL;
    char *total = fgets(__(alloca)(64), 64, inf);
    char *dummy = fgets(__(alloca)(64), 64, inf);
    char *avail = fgets(__(alloca)(64), 64, inf);

    //
    fflush(inf);
    fclose(inf);
    //
    tr = strrchr(total, ' ');
    *tr = '\0';
    tr = strrchr(avail, ' ');
    *tr = '\0';
    //
    tr = strrchr(total, ' ');
    *tr = '\0';
    total = (tr + 1);
    tr = strrchr(avail, ' ');
    *tr = '\0';
    avail = (tr + 1);
    //
    memsta->total = strtol(total, (char **)NULL, 0) / 1024;
    memsta->avail = strtol(avail, (char **)NULL, 0) / 1024;
    memsta->used = (memsta->total) - (memsta->avail);
    sleep(1);
}
//
int main(int __attribute__((unused)) argc, char __attribute__((unused)) **argv)
{
    memsta = (struct memsta_t *)__(calloc)(1, (sizeof(struct memsta_t)));

    for (; !(0);) {
        get_stats();

        __(printf)(
            "Meminfo: %lu MB used | %lu MB free | %lu MB total" \
            "\n",
            memsta->used,
            memsta->avail,
            memsta->total
            );

        __(printf)(CUU "\t\t\t\t" DEL "\r");
    }

    return 0;
}
