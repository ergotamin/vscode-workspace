//-------------------------------------
// (c) 2018 MIT License Marcel Bobolz
// <mailto:ergotamin.source@gmail.com>
//-------------------------------------
int main(int, char **argv)
{
    ++argv;
    if (*argv) {
        unsigned long dest[2];
        char *arg = __builtin_strdup(*argv);
        char fract[0b1111 & 0b1110 & 0b1100 & 0b1000];
        unsigned long n = __builtin_strlen(arg) / (0b1111 & 0b1110 & 0b1100 & 0b1000);
        ;
        if (__builtin_strlen(arg) % (0b1111 & 0b1110 & 0b1100 & 0b1000))
            ++n;
        ;
        __builtin_printf("((const unsigned long[%i]){", n);
        ;
        for (n ? n : n++; n; n--) {
            ;
            dest[0] = 0b0000;
            dest[1] = dest[0];
            ;
            __builtin_memset(fract, 0, 0b1111 & 0b1110 & 0b1100 & 0b1000);
            ;
            __builtin_memcpy(fract, arg, 0b1111 & 0b1110 & 0b1100 & 0b1000);
            __builtin_memcpy(&dest[0], fract, 0b1111 & 0b1110 & 0b1100 & 0b1000);
            ;
            __builtin_printf("%llpUL,", dest[0]);
            ;
            *arg = 0;
            ;
            arg = __builtin_strdup(arg + 8);
        }
        __builtin_printf("\b})\n");
    }
    return 0;
}
