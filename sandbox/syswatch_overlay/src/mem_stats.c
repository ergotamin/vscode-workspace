// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
#include <syswatch.h>
//
struct memsta_t *memsta;
// "Meminfo: %lu MB used | %lu MB free | %lu MB total"
void __mem_stats(void)
{
    FILE *inf = NULL;
    char *tr = NULL;
    char total[128];
    char dummy[128];
    char avail[128];
    char stats[128];

    memsta = (struct memsta_t *)__builtin_calloc(1, (sizeof(struct memsta_t)));

    for (; !(0);) {
        tr = NULL;
        inf = fopen("/proc/meminfo", "r");

        fgets(total, 128, inf);
        fgets(dummy, 128, inf);
        fgets(avail, 128, inf);

        fflush(inf);
        fclose(inf);

        tr = strrchr(total, ' ');
        *tr = '\0';
        tr = strrchr(avail, ' ');
        *tr = '\0';
        tr = strrchr(total, ' ');
        *tr = '\0';
        __builtin_strcpy(total, (tr + 1));

        tr = strrchr(avail, ' ');
        *tr = '\0';
        __builtin_strcpy(avail, (tr + 1));

        memsta->total = strtol(total, (char **)NULL, 0) / 1024;
        memsta->avail = strtol(avail, (char **)NULL, 0) / 1024;
        memsta->used = (memsta->total) - (memsta->avail);

        __builtin_memset(total, 0, 128);
        __builtin_memset(dummy, 0, 128);
        __builtin_memset(avail, 0, 128);

        __builtin_sprintf(stats, "%lu MB used | %lu MB free | %lu MB total",
                          memsta->used, memsta->avail, memsta->total);

        if (xosd_is_onscreen(osd))
            xosd_destroy(osd);

        x11_print(stats, 3, H_OFF, V_OFF);

        __builtin_memset(stats, 0, 128);

        sleep(1);
    }
    return;
}
