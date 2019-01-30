#include <iostream>
using namespace std;

struct S {
  string s;
  S(const char *str) { 
  this->s.assign(str); 
  }
  const S& operator+=(const S& right){
   this->s.append(right.s);
   return *this; 
  }
  friend S operator+(S left, const S& right)
  {
    left.s.append(right.s);
    return left; 
  }

};

S operator ""_s(const char *str,size_t){
    cout << str << endl;
    return S(str);
}

int main(void)
{
  S s1("First\n");
  S s2("Second\n");
  S s3("");
  s3 = s1 + s2;
  cout << s3.s.c_str() << endl;
  return 0;
}