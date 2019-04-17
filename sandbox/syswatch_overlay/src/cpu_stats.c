// !c++
//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
//
#include <syswatch.h>
//
struct cpusta_t *cpusta;
// "CPU: %.2f %%"
void __cpu_stats(void)
{
    FILE *stf = NULL;
    char *tok = NULL;
    char *total = NULL;
    unsigned int n = 0;
    char stats[128];

    cpusta = (struct cpusta_t *)__builtin_calloc(1, (sizeof(struct cpusta_t)));

    for (; !(0);) {
        n = 0;
        tok = NULL;
        stf = fopen("/proc/stat", "r");

        total = fgets(__builtin_calloc(1, 256), 256, stf);

        fflush(stf);
        fclose(stf);

        cpusta->total = 0;
        tok = strtok_r(total, " ", &total);

        while ((tok = strtok_r(total, " ", &total))) {
            ++n;
            if (4U == n)
                cpusta->idle = strtol(tok, (char **)NULL, 0);
            cpusta->total += strtol(tok, (char **)NULL, 0);
        }

        cpusta->diff_idle = cpusta->idle - cpusta->prev_idle;
        cpusta->diff_total = cpusta->total - cpusta->prev_total;

        cpusta->usage = (double)
                        ((1000.0
                          * (cpusta->diff_total - cpusta->diff_idle)
                          / cpusta->diff_total + 5) / 10.0);

        cpusta->prev_total = cpusta->total;
        cpusta->prev_idle = cpusta->idle;

        __builtin_sprintf(stats, "CPU: %.2f %%",
                          cpusta->usage);

        if (xosd_is_onscreen(osd))
            xosd_destroy(osd);

        x11_print(stats, 1, H_OFF, V_OFF);

        __builtin_memset(stats, 0, 128);

        sleep(1);
    }

    return;
}
