#  __execve.S
#  executes the syscall
#  (c) 2019 MIT License
#  Marcel Bobolz
#  <ergotamin.source@gmail.com>

        .globl __execve

        .text
__execve:
        push           %rdi	        # argc
        push           %rsi	        # argv
        add             $8,     %rsp	# stack align
#       add             $8,     %rsi	# argv++
        mov         (%rsi),     %rdi	# function parameter 1
        mov             $0,     %rdx	# envp = 0
        mov            $59,     %rax	# setup syscall
        syscall	                        # call execve
        ret	                        # should not return