#include <iostream>
using namespace std;

#define MAX_PROJECT (15) 
typedef struct{
    int start_date; // Start date
    int end_date; // End date
}DATA;

int     N; // Number of projects
DATA    project_info[MAX_PROJECT]; // Project Infomation

void Data_Input(void) {
    cin >> N; // Input of number of projects
    // Input of project information
    for (int i = 0; i < N; i++) {
        cin >> project_info[i].start_date >> project_info[i].end_date;
    }
}

int main(void) {
    int sol = 0;
    Data_Input(); // Calling of input function

    cout << sol << endl; // Output of result
    return 0;
}