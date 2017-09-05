/*	Correct the error(s) in the following program.	*/
#include <iostream>

using namespace std;

int main()
{
    int N = 0;
    cin >> N;
    int *a = new int[N*N];

    // Section to input the fine dust change for each of N hours and N days
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            cin >> a[i*N + j];
        }
    }

    int max_row = 0;	// Variable to store the day (row) of the largest sum of fine dust changes
    int min_col = 0;	// Variable to store the hour (column) of the smallest sum of fine dust changes

    long long sum = 0;		// Variable to store the sum of fine dust changes

    long long min_sum = 0;


    // Section to calculate which time slot (column) has the smallest sum of fine dust changes
    for (int j = 0; j < N; j++) {
        sum = 0;
        // Calculate the sum of fine dust changes of jth hour (column) during N days
        for (int i = 0; i < N; i++) {
            sum += a[i*N + j];
        }

        // 각 시간대(열)의 미세먼지 변화량 합이 가장 작은 시간(열)을 구하는 부분
        if (sum < min_sum || j == 0){
            min_sum = sum;
            min_col = j;
        }
    }

    long long max_sum = 0;

    // Section to calculate which day (row) has the largest sum of fine dust changes
    for (int i = 0; i < N; i++)	{
        sum = 0;

        // Calculate the sum of fine dust changes for N hours on the ith day (row)
        for (int j = 0; j < N; j++) {
            sum += a[i*N + j];
        }

        // Section to obtain the day (row) that has the largest sum of fine dust changes on each day (row)
        if (sum > max_sum || i == 0) {
            max_sum = sum;
            max_row = i;
        }
    }

    cout << (max_row + 1) << " " << (min_col + 1) << endl;
    delete[]a;
    system("PAUSE");
    return 0;
}
