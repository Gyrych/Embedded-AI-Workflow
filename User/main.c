#include <stdio.h>
#include <string.h>
#include <wiringPi.h>

void init_GPIO(void)
{
	wiringPiSetup();
	pinMode(0, OUTPUT);
	pinMode(1, OUTPUT);
	pinMode(2, OUTPUT);
	pinMode(3, OUTPUT);
	pinMode(4, OUTPUT);
	pinMode(5, OUTPUT);
	pinMode(6, OUTPUT);
	pinMode(7, OUTPUT);
}

void water_lamp(void)
{
	int i =0;

	for(i = 0; i < 8; i++)
	{
		digitalWrite(i, HIGH);
		delay(100);
	}
	for(i = 0; i < 8; i++)
	{
		digitalWrite(i, LOW);
		delay(100);
	}
}

int main()
{
	char inputstr[1000] = {0};

	init_GPIO();

	while(1)
	{
		printf("->");
		scanf("%s" , inputstr);
		if(strcmp(inputstr, "start") == 0)
		{
			water_lamp();
		}
		else if(strcmp(inputstr, "loop") == 0)
		{
			while(1) water_lamp();
		}
		else if(strcmp(inputstr, "exit") == 0)
		{
			return 0;
		}
		else if(strcmp(inputstr, "help") == 0)
		{
			printf("start, run once.\nloop, keep running.\nexit, exit operation.\nhelp, get help.\n");
		}
		else
		{
			printf("Input Error!\n");
		}
	}
	return 0;
}
