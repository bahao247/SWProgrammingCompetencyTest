#include <iostream>

#include "drill.h"

using namespace std;

int tarr[][5] = { 
	{10, 0, 30, 4, 0 },
	{10, 2, 20, 0, 0 }, 
	{30, 6, 46, 1, 0},	
	{20, 2, 36, 6, 0},  
	{10, 1, 11, 1, 0 },	
	{0, 2, 11, 2, 0 }, 
	{10, 2, 50, 2, 0 }, 
	{20, 2, 10, 2, 0 } 
};

int main()
{
	int i;

	for(i = 0; i <(sizeof(tarr)/sizeof(tarr[0])); i++)
	{
		cout << "[" << i << "]";
		cout << " Expected = " << tarr[i][4];
		cout << " Return = " << drill(tarr[i][0], tarr[i][1], tarr[i][2], tarr[i][3]);
		cout << endl;
	}

	return 0;
}
