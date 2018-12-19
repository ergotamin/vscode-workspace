#/* !clone.cc */
#// (c) 2018 MIT License
#// Marcel Bobolz
#// <ergotamin.source@gmail.com>
#include <debug.hh>
using namespace std;
extern char **environ;
extern const char *__progname;

__Begin
#include <fcntl.h>
#include <error.h>
#include <ctype.h>
#include <getopt.h>
#include <sys/wait.h>
#include <sys/prctl.h>
#include <sys/capability.h>
__End

#define STACK_SIZE    (1UL << 20)

#define XCLONE_FLAG_LIST              \
    X("clone_newns", CLONE_NEWNS)     \
    X("clone_newpid", CLONE_NEWPID)   \
    X("clone_newuser", CLONE_NEWUSER) \
    X("clone_parent", CLONE_PARENT)

#define X(key, value) { .name = key, .flag_t = value },
static const struct {
    const char	*name;
    int			flag_t;
} CloneFlags[5] = {
    XCLONE_FLAG_LIST
    { nullptr, 0 }
};
#undef X
#undef XCLONE_FLAG_LIST

static int help_flag;
static char child_stack[(1UL << 20)];

static struct option long_options[] =
{
    { "help",		 no_argument,		&help_flag, 1	},
    { "clone_flags", required_argument, 0,			'f' },
    { 0,			 0,					0,			0	}
};

static const char *help_text[] = {
    "Usage:\n",
    "clone\n\t",                                         \
    "--help - display this help.\n\t",                   \
    "--clone_flags - define flags for clone().\n\t",     \
    "-----------------------------------------------\n", \
    "Used to test clone() \nin different scenarios.\n",  \
    nullptr
};

static int clone_func(void *argp)
{
    cap_t caps = cap_get_pid(getpid());

    for (int c = 0; c < (CAP_LAST_CAP + 1); c++)
        cap_clear_flag(caps, (cap_flag_t)c);

    if (!clearenv()) {
        if (NULL == secure_getenv("PATH"))
            if (-1 == setenv("PATH", "/sbin:/bin:/usr/bin:/usr/local/bin", 1))
                error(-1, errno, "error: setenv(PATH) failed with %s ...\n", strerror(errno));
        if (NULL == secure_getenv("SHELL")) {
            if (-1 == setenv("SHELL", "/bin/bash", 1))
                error(-1, errno, "error: setenv(SHELL) failed with %s ...\n", strerror(errno));
        } else {
            perror("environment was not cleared !");
            exit(EXIT_FAILURE);
        }

        int secs = 0;
        do {
            printf("\t[running since %.4i seconds]\n\t\tPID: %d\n\t[ EUID = %ld | EGID = %ld ]\n",
                   secs, getpid(), (long)geteuid(), (long)getegid());
            sleep(1);
            secs++;
            printf("\x1b[A\x1b[1K\r");
            printf("\x1b[A\x1b[1K\r");
            printf("\x1b[A\x1b[1K\r");
        } while (!0);

        exit(EXIT_SUCCESS);
    } else {
        perror("clearenv() failed.");
        exit(EXIT_FAILURE);
    }
}


int main(int argc, char *argv[])
{
    int opt;
    cap_t caps = cap_get_pid(getpid());
    long unsigned clone_flags_ored = 0;

    while (1) {
        int opt_id = 0;
        opt = getopt_long(argc, argv, "f:",
                          long_options, &opt_id);
        if (opt < 0)
            break;

        switch (opt) {
        case 0:
            if (long_options[opt_id].flag != 0) {
                for (int le = 0; nullptr != help_text[le]; le++)
                    puts(help_text[le]);
                return EXIT_SUCCESS;
            }
            break;

        case 'f':
            for (int i = 0; i < 5; i++) {
                if (0 == (strcmp(optarg, CloneFlags[i].name))) {
                    clone_flags_ored |= CloneFlags[i].flag_t;
                    printf("Added clone flag: %s\n", CloneFlags[i].name);
                    break;
                }
            }
            break;

        default:
            return EXIT_FAILURE;
        }
    }

    if (optind < argc) {
        printf("ignored arguments:");
        while (optind < argc)
            printf(" %s ", argv[optind++]);
        printf("\n");
    }

    for (int c = 0; c < (CAP_LAST_CAP + 1); c++)
        cap_clear_flag(caps, (cap_flag_t)c);

    printf("Dropped all flagged capabilties for this process.\n");

    if (0 == geteuid()) {
        0 != prctl(PR_SET_SECUREBITS, (~32 & 4) | (~64 & 8) | (~128 & 32), 0, 0, 0)        \
        ? once(error(-1, errno, "error: prctl() failed with %s ...\n", strerror(errno)); ) \
        : once(assert(true); );
        printf("Set the semaphore securebit to hardlock capability setup.\n");
    }

    printf("pid = %d euid = %ld egid = %ld capabilities: %s\n",
           getpid(), (long)geteuid(), (long)getegid(), cap_to_text(caps, nullptr));


    if (0 == clone_flags_ored)
        clone_flags_ored |= CLONE_NEWUSER;

    pid_t cpid = clone(clone_func, child_stack + STACK_SIZE, clone_flags_ored | SIGCHLD, nullptr);

    getchar_unlocked();

    return kill(cpid, SIGKILL);
}
