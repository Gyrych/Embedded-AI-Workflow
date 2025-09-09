# 2_Test_GPIO_wiringPi

基于 wiringPi 的 GPIO 跑马灯示例（Raspberry Pi）。

- 功能：使用 wiringPi 编号的引脚 0~7 轮流点亮，提供交互命令控制。
- 主要文件：
  - `User/main.c`：程序源码
  - `Output/main.out`：编译后的可执行文件（本地生成，建议不提交）
  - `User/Makefile`：示例 Makefile（如使用异常，可直接用下述 gcc 命令）

## 依赖

- Raspberry Pi（支持 GPIO）
- wiringPi 库（确保可被编译器找到并链接）

检查是否安装：
```bash
gpio -v
```
若未安装，请根据你的系统环境安装 wiringPi。

## 编译

从仓库根目录执行：
```bash
mkdir -p Output && gcc User/main.c -o Output/main.out -lwiringPi
```

或在 `User` 目录下尝试使用 `Makefile`：
```bash
cd User && make
```

## 运行

```bash
./Output/main.out
```

交互命令：
- start：运行一次
- loop：持续运行（使用 Ctrl+C 终止）
- exit：退出程序
- help：显示帮助

## 清理

```bash
rm -f Output/main.out
```

## 说明

- 引脚编号使用 wiringPi 编号（非 BCM/物理脚位）。如需调整，请修改 `User/main.c` 中 `pinMode`/`digitalWrite` 的引脚号。
- 示例中每次点亮/熄灭延迟为 100ms，可根据需要调整 `delay(100)`。

