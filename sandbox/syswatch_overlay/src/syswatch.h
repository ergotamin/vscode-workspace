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
#include <signal.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <xosd/xosd.h>
//
#define H_OFF       (-175)
#define V_OFF       (0)
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
struct memsta_t {
    unsigned long	total;
    unsigned long	avail;
    unsigned long	used;
};
//
struct netsta_t {
    unsigned int	fmt_in;
    unsigned int	fmt_out;
    double			bytes_in;
    double			bytes_out;
};
//
extern struct cpusta_t *cpusta;
extern struct memsta_t *memsta;
extern struct netsta_t *netsta;
extern struct xosd *osd;
//
extern void __clean_exit(int signo);
extern void __cpu_stats(void);
extern void __mem_stats(void);
extern void __net_stats(void *data);
extern int x11_print(const char *text, unsigned int lino, int h_off, int v_off);
//
