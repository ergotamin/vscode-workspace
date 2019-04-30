//      ------------------------------
//              MIT-License 0x7e3
//       <ergotamin.source@gmail.com>
//      ------------------------------
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <setjmp.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <X11/Xlib.h>
#include <X11/Xatom.h>
#include <X11/Xmu/Atoms.h>
//
extern const char *__progname;
//
enum XcbOutContext {
    XCB_OUT_NONE,
    XCB_OUT_CONV,
    XCB_OUT_INCR,
    XCB_OUT_FAIL
};
//
static Window window;
static Display *display;
static Atom selection;
static Atom target;
static char *ofile = NULL;
//
#define die(msg)                                                     \
    do {                                                             \
        fprintf(stderr, "[%s : %i]"msg " :(\n", __func__, __LINE__); \
        exit(127);                                                   \
    } while (0)
//
#define get_atom(id) \
    (XInternAtom(display, id, False))
//
static unsigned char *xalloc(unsigned long bytes)
{
    static void *mem;

    bytes = bytes
            ? bytes
            : bytes + 1UL;

    mem = calloc(bytes, sizeof(unsigned char));

    if (NULL == mem)
        die("calloc failed.");

    return (unsigned char *)mem;
}
//
static unsigned char *xrealloc(void *ptr, unsigned long bytes)
{
    void *mem = realloc(ptr, bytes);

    if (NULL == mem)
        die("realloc failed.");

    return (unsigned char *)mem;
}
//
static size_t
size_of_format(int format)
{
    if (format == 8)
        return sizeof(char);
    if (format == 16)
        return sizeof(short);
    if (format == 32)
        return sizeof(long);
    return 0;
}
//
int xpaste(XEvent evt, Atom *type, unsigned char **value,
           unsigned long *len, unsigned int *context)
{
    int format;
    static Atom prop;
    static Atom incr;
    unsigned char *rvalue;
    unsigned long prop_size;
    unsigned long prop_items;
    unsigned long prop_fmtsize;
    unsigned char *cvalue = *value;

    if (!prop)
        prop = get_atom("XCB_RECORD");

    if (!incr)
        incr = get_atom("INCR");


    switch (*context) {
    case XCB_OUT_NONE:
        if (*len > 0) {
            free(*value);
            *len = 0;
        }

        XConvertSelection(display, selection, target, prop, window, CurrentTime);
        *context = XCB_OUT_CONV;
        return 0;

    case XCB_OUT_CONV:
        if (evt.type != SelectionNotify)
            return 0;

        if (evt.xselection.property == None) {
            *context = XCB_OUT_FAIL;
            return 0;
        }

        XGetWindowProperty(display, window, prop, 0, 0, False, AnyPropertyType,
                           type, &format, &prop_items, &prop_size, &rvalue);
        XFree(rvalue);

        if (*type == incr) {
            XDeleteProperty(display, window, prop);
            XFlush(display);
            *context = XCB_OUT_INCR;
            return 0;
        }

        XGetWindowProperty(display, window, prop, 0, (long)prop_size, False, AnyPropertyType,
                           type, &format, &prop_items, &prop_size, &rvalue);

        XDeleteProperty(display, window, prop);

        prop_fmtsize = prop_items * size_of_format(format);
        cvalue = xalloc(prop_fmtsize);
        memcpy(cvalue, rvalue, prop_fmtsize);
        *len = prop_fmtsize;
        *value = cvalue;

        XFree(rvalue);

        *context = XCB_OUT_NONE;

        return 1;

    case XCB_OUT_INCR:
        if (evt.type != PropertyNotify)
            return 0;

        /* skip unless the property has a new value */
        if (evt.xproperty.state != PropertyNewValue)
            return 0;

        /* check size and format of the property */
        XGetWindowProperty(display, window, prop, 0, 0, False, AnyPropertyType,
                           type, &format, &prop_items, &prop_size, (unsigned char **)&rvalue);

        if (prop_size == 0) {
            XFree(rvalue);
            XDeleteProperty(display, window, prop);
            *context = XCB_OUT_NONE;

            return 1;
        }

        XFree(rvalue);

        XGetWindowProperty(display, window, prop, 0, (long)prop_size, False, AnyPropertyType,
                           type, &format, &prop_items, &prop_size, (unsigned char **)&rvalue);

        prop_fmtsize = prop_items * size_of_format(format);

        if (*len == 0) {
            *len = prop_fmtsize;
            cvalue = xalloc(*len);
        } else {
            *len += prop_fmtsize;
            cvalue = xrealloc(cvalue, *len);
        }

        memcpy(&cvalue[*len - prop_fmtsize], rvalue, prop_fmtsize);

        *value = cvalue;
        XFree(rvalue);

        XDeleteProperty(display, window, prop);
        XFlush(display);
        return 0;
    }

    return 0;
}
//
static void print_buffer(FILE *fout, Atom type,
                         unsigned char *buf, size_t len)
{
    if (type == XA_INTEGER) {
        long *long_buf = (long *)buf;
        size_t long_len = len / sizeof(long);

        while (long_len--)
            fprintf(fout, "%ld\n", *long_buf++);

        return;
    }

    if (type == XA_ATOM) {
        Atom *atom_buf = (Atom *)buf;
        size_t atom_len = len / sizeof(Atom);

        while (atom_len--) {
            char *atom_name = XGetAtomName(display, *atom_buf++);
            fprintf(fout, "%s\n", atom_name);
            XFree(atom_name);
        }

        return;
    }

    fwrite(buf, sizeof(char), len, fout);
}
//
static int xcb_paste(void)
{
    XEvent evt;
    Atom type = None;
    unsigned char *buf;
    unsigned long len = 0;
    unsigned int context = XCB_OUT_NONE;

    if (selection == XA_STRING) {
        buf = (unsigned char *)XFetchBuffer(display, (int *)&len, 0);
    } else {
        while (1) {
            /* only get an event if xcout() is doing something */
            if (context != XCB_OUT_NONE)
                XNextEvent(display, &evt);

            /* fetch the selection, or part of it */
            xpaste(evt, &type, &buf, &len, &context);

            if (context == XCB_OUT_FAIL) {
                if (target == get_atom("UTF8_STRING")) {
                    context = XCB_OUT_NONE;
                    target = XA_STRING;
                    continue;
                } else {
                    char *atom_name = XGetAtomName(display, target);
                    fprintf(stderr,
                            "Error: '%s' is not available\n",
                            atom_name);
                    XFree(atom_name);
                    return 1;
                }
            }

            if (context == XCB_OUT_NONE)
                break;
        }
    }

    if (len && buf[len - 1] == '\n')
        len--;

    if (len) {
        if (NULL != ofile) {
            FILE *outstr = fopen(ofile, "w+");
            print_buffer(outstr, type, buf, len);
            fflush(outstr);
            fclose(outstr);
        } else {
            print_buffer(stdout, type, buf, len);
        }

        if (selection == XA_STRING)
            XFree(buf);
        else
            free(buf);
    }

    return 0;
}
//
int main(int argc, char **argv)
{
    --argc;
    int retval;
    char dpy_num[1 << 4];

    display = XOpenDisplay(NULL);

    for (int i = 0; NULL == display; i++) {
        memset(dpy_num, 0, 1 << 4);
        snprintf(dpy_num, 1 << 4, ":%i%c", i, 0);
        display = XOpenDisplay(dpy_num);
    }

    if (NULL == display)
        die("no useable display.");

    selection = get_atom("CLIPBOARD");

    target = (1 <= argc)
             ? get_atom(argv[1])
             : get_atom("TARGETS");

    if (2 == argc)
        ofile = argv[2];

    window = XCreateSimpleWindow(display, DefaultRootWindow(display),
                                 0, 0, 1, 1, 0, 0, 0);

    XSelectInput(display, window, PropertyChangeMask);

    retval = xcb_paste();

    XCloseDisplay(display);

    return retval;
}
