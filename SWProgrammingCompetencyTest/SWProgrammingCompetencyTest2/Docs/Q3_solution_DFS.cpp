#include <iostream>
using namespace std;

#define MAX_PROJECT (15) 
#define MAX_DATE (300)
typedef struct{
	int start_date; 
	int end_date; 
}DATA;

int     N; 
DATA    project_info[MAX_PROJECT]; 
int		date_chk[MAX_DATE +1]; 

void Data_Input(void) {
	cin >> N; 
	
	for (int i = 0; i<N; i++) {
		cin >> project_info[i].start_date >> project_info[i].end_date;
	}
}

int Check_date(int start_date, int end_date){
	for (int i = start_date; i <= end_date; i++){
		if (date_chk[i]) return 0;
	}
	return 1;
}

void Set_date(int start_date, int end_date){
	for (int i = start_date; i <= end_date; i++){
		date_chk[i] = 1;
	}
}

void Reset_date(int start_date, int end_date){
	for (int i = start_date; i <= end_date; i++){
		date_chk[i] = 0;
	}
}


int Solve(int n, int cnt){
	int max=cnt, ret;
	if (n >= N) return cnt;

	for(int i=n;i<N;i++){ 
		if (Check_date(project_info[i].start_date, project_info[i].end_date))	{
			Set_date(project_info[i].start_date, project_info[i].end_date); 
			ret = Solve(i + 1, cnt + 1); 
			if (max < ret) max = ret; 
			Reset_date(project_info[i].start_date, project_info[i].end_date); 
		}
	}
	return max;
}

int main(void) {
	int sol;
	Data_Input();   

	sol = Solve(0, 0); 
	cout << sol << endl; 
	return 0;
}