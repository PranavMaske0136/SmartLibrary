
#include <iostream>
#include "sqlite3.h"

using namespace std;

extern bool connectDatabase();
extern void closeDatabase();

int main()
{
    cout << "Smart Library Backend Starting..." << endl;

    if (!connectDatabase())
    {
        return 1;
    }

    cout << "C++11 Backend is Running!" << endl;

    closeDatabase();

    return 0;
}
