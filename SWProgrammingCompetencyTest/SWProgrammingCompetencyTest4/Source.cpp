#include <stdio.h>
using namespace std;
#define MAXQ (500*500+10)
int mHeight;//Height
int mWeight;//Width
char map[500][510];//Map
int visit[500][500];

void input_data(void){
    int i;
    scanf_s("%d %d", &mHeight, &mWeight);
    for (i = 0; i < mHeight; i++){
        scanf_s("%s", map[i]);
    }
}

struct sSaveStatus{
    int height, weight, temp;
};

int wpTempIndex, rpNowIndex;
int goUpDown[] = {-1, 1, 0, 0};
int goRightLeft[] = {0, 0, -1, 1};
sSaveStatus queue[MAXQ];

int FindMinDistance()
{
    int i, height, weight;
    sSaveStatus data;

    wpTempIndex = rpNowIndex = 0;

    queue[wpTempIndex].height = 0;
    queue[wpTempIndex].weight = 0;
    queue[wpTempIndex++].temp = 0;

    visit[0][0] = 1;

    while (rpNowIndex < wpTempIndex)
    {
        data = queue[rpNowIndex++];
        for (i = 0; i < 4; i++)
        {
            height = data.height + goUpDown[i];
            weight = data.weight + goRightLeft[i];

            //Check condition
            if ((height < 0) || (height >= mHeight) || (weight < 0) || (weight >= mWeight))
            {
                continue;
            }

            //Check tree
            if (map[height][weight] == 'X')
            {
                continue;
            }

            //Check old street 
            if (visit[height][weight] == 1)
            {
                continue;
            }

            if ((height == mHeight - 1) && (weight == mWeight - 1))
            {
                return data.temp + 1;
            }
            queue[wpTempIndex].height = height;
            queue[wpTempIndex].weight = weight;
            queue[wpTempIndex++].temp = data.temp + 1;
            visit[height][weight] = 1;
        }
    }

    return -1;
}

int main(void){
    int ans = 0;
    input_data();

    // Todo : write the code
    ans = FindMinDistance();

    printf("%d\n", ans);
    return 0;
}
