#include <iostream>
using namespace std;

int mCountDay;			//	Test day
int h[31];	//	Test time
int mValue;

void InputData(){
    cin >> mCountDay;
    for (int i = 0; i < mCountDay; i++){
        cin >> h[i];
    }
}

int main(){
    mValue = 0;
    InputData();						//	Input function

    //	Complete so the final calculation can be saved to sol.
    for (int i = 0; i < mCountDay; i++){
        if (h[i] < 3 || mValue > 5000000)
        {
            continue;
        }
        else if (h[i] == 3 || (h[i] > 3 && h[i] < 6))
        {
            mValue += 1000000;
        }
        else if (h[i] > 6)
        {
            mValue += (h[i] / 6) * 500000;
        }
    }

    if (mValue >= 100000000)
    {
        mValue = mValue * 0.9;
    }

    cout << mValue/1000 << endl; 		// Print answer
    return 0;
}