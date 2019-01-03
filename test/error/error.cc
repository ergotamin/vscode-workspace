#/* !cfilesystem.cc */
#// (c) 2019 MIT License
#// Marcel Bobolz
#// <ergotamin.source@gmail.com>

#include <iostream>

std::ostream& error(std::string e)
{
    return std::cerr << "\x1b[38:2:255:20:60m" << e << "\x1b(B\x1b[m" << std::endl;
}

template<typename T, typename ... Targs>
std::ostream& error(std::string e, T s, Targs... Vargs)
{
    if (nullptr != s) {
        e.append(s);
        return error(e, Vargs ...);
    } else {
        return error(e);
    }
}

int main(int, char **argv)
{
    error("This is my string", argv[1]) << argv[2] << std::endl;
    return 0;
}
