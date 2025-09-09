## Embedded AI Workflow（VS Code 插件）

一个在 VS Code 中可视化编排嵌入式 AI 生成流程的插件。通过工作流面板，将需求分解为可复用的步骤，辅助自动化生成并组织 STM32/ESP32 等 MCU 的工程代码。

### 功能概览
- **命令**: 通过 VS Code 命令面板运行 `Open Embedded AI Workflow`（命令 ID：`workflow.openPanel`）打开工作流面板。
- **Webview 面板**: 插件提供一个可视化面板（保留上下文、允许脚本），用于承载工作流 UI。
- **工程结构清晰**: TypeScript 源码、静态资源和编译产物分离。

### 目录结构
- `embedded-ai-workflow/`
  - `src/extension.ts`: 插件入口，注册命令并打开面板。
  - `src/panel/WorkflowPanel.ts`: Webview 面板逻辑与 HTML 内容。
  - `media/`: Webview 前端的 `main.js`、`styles.css` 等静态资源。
  - `out/`: TypeScript 编译后的 JS 输出（由 `tsc` 生成）。
  - `package.json`: 插件元数据、命令、脚本和依赖。
  - `tsconfig.json`: TypeScript 配置。

### 开发与调试
前置条件：Node.js 18+、VS Code 1.88+。

1. 安装依赖并启动监听编译：
```bash
cd embedded-ai-workflow
npm install
npm run watch
```
2. 在 VS Code 中按 `F5`（Run Extension）启动插件调试宿主，打开命令面板执行 `Open Embedded AI Workflow`。

### 构建与打包
使用 `vsce` 打包扩展为 `.vsix`：
```bash
npm install -g @vscode/vsce
cd embedded-ai-workflow
npm run package
```
生成的 `.vsix` 可通过 VS Code 安装：
```bash
code --install-extension embedded-ai-workflow-0.0.1.vsix
```

### 使用方法
1. 打开命令面板（Ctrl/Cmd+Shift+P），执行 `Open Embedded AI Workflow`。
2. 在出现的面板中配置或运行你的 AI 工作流（当前为占位 UI，可按需扩展）。

### 许可证
本项目采用 MIT 许可证。

### 备注
仓库中与“AI 工作流插件”无关的示例/旧代码已移除或将被清理，实际插件代码位于 `embedded-ai-workflow/` 目录下。
