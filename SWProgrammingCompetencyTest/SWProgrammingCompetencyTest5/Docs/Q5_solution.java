import drill.test.*;

public class DrillTest {

	public int[][] testParameters = {
			{10, 2, 30, 4, 1},
			{30, 4, 10, 2, 0},	
			{10, 4, 20, 5, 0},	
			{5, 4, 30, 4, 0},		
			{10, 2, 45, 4, 0},	
			{10, 6, 30, 4, 0},	
			{10, 2, 30, 6, 0},	
			{10, 0, 30, 4, 0},		
			{10, 2, 30, 0, 0},	
			{50, 2, 20, 4, 0},	
			{10, 2, 50, 4, 0},	

	};

	public void runAll() {
		for (int i = 0; i < testParameters.length; ++i) {
			System.out.print(String.format("[%d] ", i));
			System.out.print(String.format("Expected = %d, ", testParameters[i][4]));
			int result = Machine.drill(testParameters[i][0], testParameters[i][1], testParameters[i][2], testParameters[i][3]);
			System.out.println(String.format("Return = %d", result));
		}
		
	}
	
	public static void main(String[] args) {
		DrillTest test = new DrillTest();
		test.runAll();
	}


}
