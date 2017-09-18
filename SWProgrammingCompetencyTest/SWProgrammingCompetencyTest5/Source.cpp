#include <iostream>

#include "drill.h"
/*
* There is below function definition in drill.h
int drill(int x1, int r1, int x2, int r2);
*/

using namespace std;

/* [Description] */
/* 1. Add one or more test cases in the following array. The number of cases does not matter. The name and type of the array cannot be changed. */
/* 2. Test case array structure : {x1, r1, x2, r2, expected return value} */
int tarr[][5] = {
    { 10, 2, 30, 4, 1 },
};

/* The methods runAll and main below are used for verification of the generated test case. */
/* They can be changed freely as needed. */
/*  The methods runAll and main below are not related to scoring. */

int main()
{
    int i;

    for (i = 0; i <(sizeof(tarr) / sizeof(tarr[0])); i++)
    {
        cout << "[" << i << "]";
        cout << " Expected = " << tarr[i][4];
        cout << " Return = " << drill(tarr[i][0], tarr[i][1], tarr[i][2], tarr[i][3]);
        cout << endl;
    }

    return 0;
}
