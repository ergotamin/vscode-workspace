#include <boost/regex.hpp>
#include <cstdio>
#include <cstdlib>
#include <cstddef>
#include <string>
#include <csignal>
#include <iostream>
#include <fstream>
using namespace std;
using namespace boost;

template <typename T>
struct RegExp {
    T		str;
    regex	Re;
    smatch	M;
    RegExp(T cstr)
    {
        char *buf;
        streampos le;
        ifstream F(cstr, ios::in | ios::ate);

        le = F.tellg();
        buf = new char[le];
        F.seekg(0, ios::beg);
        F.read(buf, le);
        F.close();
        this->str = strdup(static_cast<T>(buf));
        delete []buf;
    };
    ~RegExp(void)
    {
        ;
    };
    bool search(T R)
    {
        this->Re = basic_regex<char>(R, regex_constants::perl|regex_constants::);
        basic_string<char> s = basic_string<char>(this->str);
        return regex_search(s, this->M, this->Re);
    };
    void print_match(T N)
    {
        cout << N << ":\n" << this->M[N] << endl;
    };
};

static int repeat;

void sigint_handle(int signo)
{
    if (signo == 2)
        repeat = 0;
}

int main(int, const char **argv)
{
    argv++;
    RegExp<const char *> Expr(*argv);
    repeat = 1;
    signal(SIGINT, sigint_handle);
    while (repeat) {
        cout << "--------------------------" << endl;
        cout << "Enter Pattern:" << endl;
        char *buf = new char[512];
        cin >> buf;
        if (Expr.search(static_cast<const char *>(buf))) {
            delete []buf;
            buf = new char[512];
            cout << "Match !" << endl << "Enter name of capturing group:" << endl;
            cin >> buf;
            Expr.print_match(static_cast<const char *>(buf));
        } else {
            cout << "No Match !" << endl;
        }
        delete []buf;
        cout << "-------------------------" << endl;
    }
    return 0;
}
