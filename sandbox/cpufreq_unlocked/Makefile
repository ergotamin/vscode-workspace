obj-m := cpufreq_unlocked.o

all:
	@make -C /lib/modules/`uname -r`/build M=`pwd`
	@xz -f cpufreq_unlocked.ko

test:
	@echo 'No tests defined'

clean:
	make -C /lib/modules/`uname -r`/build M=`pwd` clean

insmod:
	sudo insmod cpufreq_unlocked.ko

rmmod:
	sudo rmmod cpufreq_unlocked.ko
