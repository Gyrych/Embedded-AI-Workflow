# Embedded AI Workflow (VS Code Extension)

一个用于嵌入式工作流可视化与代码生成的 VS Code 插件（TypeScript）。
当前版本提供一个基于 Webview 的占位页面：Hello Workflow。

## 功能
- 命令：`Workflow: Open Embedded AI Workflow`（命令 ID：`workflow.openPanel`）
- 打开一个 Webview 面板，展示 “Hello Workflow” 占位界面

## 运行环境
- VS Code ≥ 1.88.0（`engines.vscode: ^1.88.0`）
- Node.js ≥ 18（建议 LTS）

## 开发与调试
1. 安装依赖
```bash
npm install
```
2. 启动持续编译（推荐调试时使用）
```bash
npm run watch
```
3. 在 VS Code 中按 F5（或运行调试配置 “Run Extension”）启动扩展开发主机
4. 在命令面板中执行：`Workflow: Open Embedded AI Workflow`

> 若仅需一次性构建：
```bash
npm run compile
```

## 打包（可选）
需要安装 `vsce`：
```bash
npm install -g @vscode/vsce
vsce package
```

## 目录结构
```
embedded-ai-workflow/
├─ .vscode/
│  ├─ launch.json        # 调试配置（Extension Host）
│  └─ tasks.json         # 构建/监视任务
├─ media/                # Webview 静态资源
│  ├─ main.js
│  └─ styles.css
├─ src/
│  ├─ extension.ts       # 激活扩展、注册命令
│  └─ panel/
│     └─ WorkflowPanel.ts# Webview 面板实现
├─ out/                  # TypeScript 编译产物
├─ package.json          # 扩展清单与脚本
├─ tsconfig.json         # TypeScript 配置
└─ README.md             # 本说明文档
```

## 命令清单
- `workflow.openPanel`：打开工作流面板（显示 “Hello Workflow”）

## 许可
MIT