//-------------------------------------
// (c) 2018 MIT License Marcel Bobolz
// <mailto:ergotamin.source@gmail.com>
//-------------------------------------
#include <linux/init.h>
#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/moduleparam.h>
#include <linux/version.h>
#include <linux/proc_fs.h>
#include <linux/slab.h>
#include <linux/string.h>
#include <asm/uaccess.h>
// ... equivalent to -rw-r--r--
#define SYSFS_PERM    00644
// ... to define a simple-type module-parameter
#define MODULE_PARAM(_name, _val, _desc)                \
    static __auto_type _name = _val;                    \
    module_param(_name, __typeof__(_name), SYSFS_PERM); \
    MODULE_PARM_DESC(_name, _desc)
// ... to define an array-type module-parameter
#define MODULE_PARAM_ARRAY(_type, _name, _size, _desc)                                \
    static _type _name[_size];                                                        \
    static uint _name ## _avail_in;                                                   \
    module_param_array(_name, __typeof__(_name[0]), &_name ## _avail_in, SYSFS_PERM); \
    MODULE_PARM_DESC(_name, _desc)
// ... to bind a callback-routine for a module-/cmdline-parameter
#define MODULE_PARAM_CB(_ident, _ops, _arg, _desc)     \
    module_param_cb(_ident, &_ops, &_arg, SYSFS_PERM); \
    MODULE_PARM_DESC(_ident, _desc)


MODULE_LICENSE("Dual MIT/GPL");
MODULE_AUTHOR("Marcel Bobolz <ergotamin.source@gmail.com>");
MODULE_VERSION("0.1.0");
MODULE_DESCRIPTION("* procfs i/o-node to adjust oom_score to a secure level.");
