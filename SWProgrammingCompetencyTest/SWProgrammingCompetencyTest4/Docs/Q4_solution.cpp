#include <iostream>
using namespace std;
#define MAXQ (500*500+10)
int H;
int W;
char map[500][510];
int visit[500][500];
struct st{
	int h, w, t;
};
st queue[MAXQ];
int wp, rp;
int hh[] = {-1, 1, 0, 0};
int ww[] = {0, 0, -1, 1};
int BFS(){
	int i, h, w;
	st data;
	wp = rp = 0;
	queue[wp].h = 0; queue[wp].w = 0; queue[wp++].t = 0;
	visit[0][0] = 1;
	while(rp<wp){
		data = queue[rp++];
		for(i=0 ; i<4 ; i++){
			h=data.h+hh[i]; w=data.w+ww[i];
			if((h<0) || (h>=H) || (w<0) || (w>=W)) continue;
			if(map[h][w] == 'X') continue;
			if(visit[h][w] == 1) continue;
			if((h==H-1) && (w==W-1)){
				return data.t + 1;
			}
			queue[wp].h=h; queue[wp].w=w; queue[wp++].t=data.t+1;
			visit[h][w] = 1;
		}
	}
	return -1;
}
void input_data(){
	int i;
	cin >> H >> W;
	for(i=0 ; i<H ; i++){
		cin >> map[i];
	}
}
int main(){
	input_data();
	int ans = BFS();
	cout << ans << endl;
	return 0;
}