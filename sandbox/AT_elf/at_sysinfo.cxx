// !c++
// #pragma once
//-------------------------------------
// (c) 2018 MIT License Marcel Bobolz
// <mailto:ergotamin.source@gmail.com>
//-------------------------------------

extern "C" int __execve(int, char **, char **);

int main(int argc, char **argv, char **envp)
{
    argv++;
    __execve(argc, argv, envp);
}
