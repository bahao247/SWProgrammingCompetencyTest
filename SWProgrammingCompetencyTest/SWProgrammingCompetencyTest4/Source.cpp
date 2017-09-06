#include <iostream>
using namespace std;
int H;//Height
int W;//Width
char map[500][510];//map

void input_data(){
    int i;
    cin >> H >> W;
    for (i = 0; i < H; i++){
        cin >> map[i];
    }
}

int main(){
    int ans = 0;
    input_data();
    // Todo : write the code

    cout << ans << endl;
    return 0;
}