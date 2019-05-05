//      ----------------------------------------------------
//      ..., for the sources taken from the linux kernel:
//
//      `linux/drivers/cpufreq/cpufreq_performance.c`
//      `linux/drivers/cpufreq/cpufreq_userspace.c`
//
//              GNU/GPL-License (C) 2002 - 2003
//              Dominik Brodowski
//              <linux@brodo.de>
//
//              GNU/GPL-License (C) 2001
//              Russell King
//      ---------------------------------------------------
//      ..., modifications were made by:
//
//              MIT-License (C) 2019
//              Marcel Bobolz
//              <ergotamin.source@gmail.com>
//      ---------------------------------------------------

#include <linux/init.h>
#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/moduleparam.h>
#include <linux/version.h>
#include <linux/proc_fs.h>
#include <linux/slab.h>
#include <linux/cpufreq.h>
#include <linux/mutex.h>

#define pr_kinfo(msg, ...) \
    printk(KERN_INFO pr_fmt(msg), ## __VA_ARGS__)

static DEFINE_PER_CPU(unsigned int, cpu_is_managed);
static DEFINE_MUTEX(unlocked_mutex);


static int cpufreq_unlocked_set_freq(struct cpufreq_policy *policy, unsigned int freq)
{
    int ret = -EINVAL;
    unsigned int *setspeed = policy->governor_data;

    pr_kinfo("::: cpu[%u] running at [%u] kHz\n", policy->cpu, freq);

    mutex_lock(&unlocked_mutex);
    if (!per_cpu(cpu_is_managed, policy->cpu))
        goto err;

    *setspeed = freq;

    ret = __cpufreq_driver_target(policy, freq, CPUFREQ_RELATION_L);
err:
    mutex_unlock(&unlocked_mutex);
    return ret;
}

static ssize_t cpufreq_unlocked_show_freq(struct cpufreq_policy *policy, char *buf)
{
    return sprintf(buf, "%u\n", policy->cur);
}

static int cpufreq_unlocked_policy_init(struct cpufreq_policy *policy)
{
    unsigned int *setspeed;

    setspeed = kzalloc(sizeof(*setspeed), GFP_KERNEL);
    if (!setspeed)
        return -ENOMEM;

    policy->governor_data = setspeed;
    return 0;
}

static void cpufreq_unlocked_policy_exit(struct cpufreq_policy *policy)
{
    mutex_lock(&unlocked_mutex);
    kfree(policy->governor_data);
    policy->governor_data = NULL;
    mutex_unlock(&unlocked_mutex);
}

static int cpufreq_unlocked_policy_start(struct cpufreq_policy *policy)
{
    unsigned int *setspeed = policy->governor_data;

    BUG_ON(!policy->cur);
    pr_kinfo("::: [cpufreq_unlocked] is now managing cpu[%u]\n", policy->cpu);

    mutex_lock(&unlocked_mutex);
    per_cpu(cpu_is_managed, policy->cpu) = 1;
    *setspeed = policy->cur;
    mutex_unlock(&unlocked_mutex);
    return 0;
}

static void cpufreq_unlocked_policy_stop(struct cpufreq_policy *policy)
{
    unsigned int *setspeed = policy->governor_data;

    pr_kinfo("::: [cpufreq_unlocked] stopped managing cpu[%u]\n", policy->cpu);

    mutex_lock(&unlocked_mutex);
    per_cpu(cpu_is_managed, policy->cpu) = 0;
    *setspeed = 0;
    mutex_unlock(&unlocked_mutex);
}

static void cpufreq_unlocked_policy_limits(struct cpufreq_policy *policy)
{
    unsigned int *setspeed = policy->governor_data;

    mutex_lock(&unlocked_mutex);

    pr_kinfo("::: [cpufreq_unlocked] setting cpu[%u](default [%u - %u kHz] current [%u kHz]) to [%u kHz]\n",
             policy->cpu, policy->min, policy->max, policy->cur, *setspeed);

    if (policy->min > *setspeed)
        __cpufreq_driver_target(policy, policy->min, CPUFREQ_RELATION_L);
    else
        __cpufreq_driver_target(policy, *setspeed, CPUFREQ_RELATION_H);

    mutex_unlock(&unlocked_mutex);
}

static struct cpufreq_governor cpufreq_unlocked = {
    .name			= "unlocked",
    .init			= cpufreq_unlocked_policy_init,
    .exit			= cpufreq_unlocked_policy_exit,
    .start			= cpufreq_unlocked_policy_start,
    .stop			= cpufreq_unlocked_policy_stop,
    .limits			= cpufreq_unlocked_policy_limits,
    .store_setspeed = cpufreq_unlocked_set_freq,
    .show_setspeed	= cpufreq_unlocked_show_freq,
    .owner			= THIS_MODULE,
};

static int __init cpufreq_unlocked_init(void)
{
    return cpufreq_register_governor(&cpufreq_unlocked);
}

static void __exit cpufreq_unlocked_exit(void)
{
    cpufreq_unregister_governor(&cpufreq_unlocked);
}

MODULE_LICENSE(
    "Dual MIT/GPL");
MODULE_VERSION(
    "1.0.0");
MODULE_DESCRIPTION(
    "CPUFreq governor 'unlocked' "
    "... for the ´insane` user! "
    "** NO WARRANTY AT ALL ! "
    "MAY SERIOUSLY DAMAGE YOUR HARDWARE ! **");
MODULE_AUTHOR(
    "Marcel Bobolz "
    "<ergotamin.source@gmail.com>");

module_init(cpufreq_gov_unlocked_init);
module_exit(cpufreq_gov_unlocked_exit);
