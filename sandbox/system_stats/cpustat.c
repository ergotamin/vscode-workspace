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
struct cpusta_t {
    long	total;
    long	idle;
    long	diff_total;
    long	diff_idle;
    long	prev_total;
    long	prev_idle;
    double	usage;
};
//
static const char *cpustat_path = "/proc/stat";
//
static struct cpusta_t *cpusta;
//
void get_stats(void);
//
#define DEL                     "\x1b[1K"
#define CUU                     "\x1b[A"
#define CNULL                   (char **)NULL
//
#define __(fn)                  __builtin_ ## fn
//
void get_stats(void)
{
    FILE *stf = fopen(cpustat_path, "r");

    unsigned int n = 0;
    char *tok = NULL;
    char *total = fgets(__(alloca)(256), 256, stf);

    fflush(stf);
    fclose(stf);

    cpusta->total = 0;
    tok = strtok_r(total, " ", &total);

    while ((tok = strtok_r(total, " ", &total))) {
        ++n;
        if (4U == n)
            cpusta->idle = strtol(tok, CNULL, 0);
        cpusta->total += strtol(tok, CNULL, 0);
    }

    cpusta->diff_idle = cpusta->idle - cpusta->prev_idle;
    cpusta->diff_total = cpusta->total - cpusta->prev_total;

    cpusta->usage = (double)
                    ((1000.0
                      * (cpusta->diff_total - cpusta->diff_idle)
                      / cpusta->diff_total + 5) / 10.0);

    cpusta->prev_total = cpusta->total;
    cpusta->prev_idle = cpusta->idle;

    sleep(1);
}
//
int main(int __attribute__((unused)) argc, char __attribute__((unused)) **argv)
{
    cpusta = (struct cpusta_t *)__(calloc)(1, (sizeof(struct cpusta_t)));

    for (; !(0);) {
        get_stats();

        __(printf)(
            "CPU-Usage: %.2f %%" "\n",
            cpusta->usage
            );

        __(printf)(CUU "\t\t\t\t" DEL "\r");
    }

    return 0;
}
