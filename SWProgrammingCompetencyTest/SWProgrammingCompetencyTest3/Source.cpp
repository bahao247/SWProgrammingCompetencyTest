#include <iostream>
using namespace std;

#define MAX_PROJECT (15) 
typedef struct{
    int start_date; // Start date
    int end_date; // End date
}DATA;

int     N; // Number of projects
DATA    project_info[MAX_PROJECT]; // Project Infomation
int mMaxProject = 0;

void Data_Input(void) {
    cin >> N; // Input of number of projects
    // Input of project information
    for (int i = 0; i < N; i++) {
        cin >> project_info[i].start_date >> project_info[i].end_date;
    }
}

void ResearchProject()
{
    int mCountProject = 1;
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++)
        {
            //project_info[i].start_date >> project_info[i].end_date;
            if (i != j)
            {
                if (project_info[i].start_date > project_info[j].end_date)
                {
                    ++mCountProject;
                }
                else
                {
                    if (project_info[i].end_date < project_info[j].start_date)
                    {
                        ++mCountProject;
                    }
                }
            }
        }
        if (mCountProject > mMaxProject)
        {
            mMaxProject = mCountProject;
        }
        mCountProject = 1;
    }
    
}

int main(void) {
    int sol = 0;
    Data_Input(); // Calling of input function
    ResearchProject();
    sol = mMaxProject;
    cout << sol << endl; // Output of result
    system("PAUSE");
    return 0;
}