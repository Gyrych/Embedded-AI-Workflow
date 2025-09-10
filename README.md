## Embedded AI Workflow · VS Code 插件

一个在 VS Code 中用“工作流 + AI”自动生成 MCU 工程代码的插件。你可以在面板中选择节点、导入/导出工作流 JSON，选择目标平台（STM32 HAL 或 ESP-IDF），一键生成最小可编译的示例工程（含构建文件），生成内容会写入工作区的 `generated/` 目录。

### 功能特性
- **工作流面板**：内置节点库（GPIO Out、Task、Timer、UART 等），点击即可向工作流 JSON 添加节点。
- **导入/导出**：从磁盘导入工作流 JSON，或将当前工作流导出为 JSON 文件。
- **目标平台选择**：支持 STM32 HAL 与 ESP-IDF 两种平台，自动附带对应的构建文件。
- **AI 生成代码（可配置）**：默认对接 OpenAI，也支持自定义 HTTP 接口。AI 按你的工作流 JSON 生成工程代码清单与文件内容。
- **生成目录**：所有生成文件写入到工作区根目录下的 `generated/` 目录，便于查看与版本管理。
- **构建文件**：
  - STM32 HAL：附带 `CMakeLists.txt`，示例 `src/main.c`
  - ESP-IDF：附带根 `CMakeLists.txt` 与 `main/CMakeLists.txt`、示例 `main/main.c`，并附 `platformio.ini` 以便使用 PlatformIO 构建

### 截图 / GIF（占位说明）
- 工作流面板左侧为节点库与平台选择、导入/导出按钮；右侧为工作流 JSON 编辑区与“生成代码”按钮。
- 点击节点库中的“GPIO Out”、“Task”等按钮，会自动向 JSON 中添加对应节点。
- 选择目标平台后，点击“生成代码”，在 VS Code 状态区显示进度与结果。
- 生成完成后，工作区会新建 `generated/` 目录，内含工程文件与构建脚本。

> 注：截图/GIF 将在后续上传至仓库的 `media/` 目录并引用到本文档。

---

## 安装

### 从 VS Code Marketplace（推荐）
1. 打开 VS Code 扩展市场，搜索 “Embedded AI Workflow”。
2. 点击安装，安装完成后即可在命令面板中使用。

或使用命令行：
```bash
code --install-extension your-publisher.embedded-ai-workflow
```

### 从源码/VSIX 安装
```bash
cd embedded-ai-workflow
npm install
npm run compile
npm install -g @vscode/vsce
npm run package

# 生成的 .vsix 位于项目根目录，版本号以实际输出为准
code --install-extension embedded-ai-workflow-<version>.vsix
```

---

## 使用教程：点亮 LED（工作流 → 生成 STM32 HAL 工程）

1) 打开命令面板（Ctrl/Cmd+Shift+P）运行：`Workflow: Open Embedded AI Workflow`。
2) 在左侧“节点库”点击添加：`GPIO Out` 与 `Task`；或直接在右侧粘贴以下工作流 JSON：
```json
{
  "nodes": [
    {"id": 1, "type": "GPIO Out", "label": "LED"},
    {"id": 2, "type": "Task", "label": "BlinkTask"}
  ],
  "edges": [
    {"from": 2, "to": 1}
  ]
}
```
3) 选择目标平台：`STM32 HAL`。
4) 点击“生成代码”。
5) 生成完成后，在工作区根目录查看 `generated/`：
   - `CMakeLists.txt`
   - `src/main.c`
   - `README.md`

> 若未配置 AI Key 或访问失败，插件会使用本地 Mock 模板生成最小示例，便于你快速验证流程。

---

## 配置

在 VS Code 设置中搜索 “Embedded AI Workflow”，或在 `settings.json` 中手动配置：

```json
{
  "embedded-ai-workflow.ai.provider": "openai",          // openai | http
  "embedded-ai-workflow.ai.openai.baseUrl": "https://api.openai.com/v1",
  "embedded-ai-workflow.ai.openai.model": "gpt-4o-mini",
  "embedded-ai-workflow.ai.openai.apiKey": "",           // 留空则读取环境变量 OPENAI_API_KEY

  "embedded-ai-workflow.ai.http.endpoint": "",           // 自定义 HTTP：POST { workflow, platform }
  "embedded-ai-workflow.ai.http.apiKeyHeader": "Authorization",
  "embedded-ai-workflow.ai.http.apiKey": ""
}
```

- 环境变量支持：`OPENAI_API_KEY`
- 消息返回格式：AI 需返回严格 JSON：
```json
{
  "files": [
    { "path": "src/main.c", "content": "..." },
    { "path": "CMakeLists.txt", "content": "..." }
  ]
}
```

---

## 开发与调试

前置条件：Node.js 18+、VS Code 1.88+。

```bash
cd embedded-ai-workflow
npm install
npm run watch
```
在 VS Code 中按 `F5`（Run Extension）启动插件调试宿主，执行命令 `Workflow: Open Embedded AI Workflow` 打开面板。

---

## 未来规划 / Roadmap

- 更多 MCU 支持：nRF52、RP2040、AVR、MSP430、GD32 等生态与 SDK 集成
- 节点插件生态：定义节点插件 API 与社区市场，支持第三方节点库
- 可视化调试：运行时可视化、数据流/事件流追踪、任务级断点与日志
- 画布编辑器：在面板中直接连线、拖拽、参数化节点
- 模板与知识库：内置工程模板、RAG 检索厂商 HAL/驱动文档提升生成质量
- 项目脚手架：一键拉取并配置对应平台 SDK/Toolchain
- 离线模型支持：可选本地/边缘大模型，保护知识产权

---

## 贡献

欢迎 Issue / PR！请先阅读 `embedded-ai-workflow/` 内代码结构，提交前确保 `npm run compile` 通过。

---

## 许可证

MIT License
