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
    { 10, 0, 30, 4, 0 },
    { 10, 2, 20, 0, 0 },
    { 30, 6, 46, 1, 0 },
    { 20, 2, 36, 6, 0 },
    { 10, 1, 11, 1, 0 },
    { 0, 2, 11, 2, 0 },
    { 10, 2, 50, 2, 0 },
    { 20, 2, 10, 2, 0 }
};

/* The methods runAll and main below are used for verification of the generated test case. */
/* They can be changed freely as needed. */
/*  The methods runAll and main below are not related to scoring. */
float distanceCircle(int x1, int r1, int x2, int r2)
{
    int s = (x2 - x1)*(x2 - x1);
    float distanceC = sqrt(s) - (r1 + r2);
    return distanceC;
}

float distanceBoundary(int x1, int r1)
{
    int s = (x1*x1);
    float distanceB = sqrt(s) - (r1);
    return distanceB;
}

int drill(int x1, int r1, int x2, int r2)
{
    if (x1 < 0 || x1 > 50 || x2 < 0 || x2 > 50 || r1 < 1 || r1 > 50 || r2 < 1 || r2 > 50 || x1 > x2 || distanceCircle(x1, r1, x2, r2) < 2 || distanceBoundary(x1, r1) < 2 || distanceBoundary(x2, r2) < 2)
    {
        return 0;
    }
    return 1;
}

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
