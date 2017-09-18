#include <stdio.h>
#include "drill.h"

int tarr[][5] = { 
 {28,2,34,4,0},

 {10,6,30,4,0},
 {10,2,30,6,0},

 {3,2,30,4,0},
 {10,2,47,4,0},


 {10,0,30,4,0},
 {10,2,30,0,0},
	
 {30,2,20,4,0},
};

int main()
{
	int i;

	for(i = 0; i <(sizeof(tarr)/sizeof(tarr[0])); i++)
	{
		printf("[%d] ", i);
		printf("Expected = %d, ", tarr[i][4]);
		printf("Return = %d\n", drill(tarr[i][0], tarr[i][1], tarr[i][2], tarr[i][3]));
	}

	return 0;
}
