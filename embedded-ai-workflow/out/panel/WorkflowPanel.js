"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowPanel = void 0;
const vscode = __importStar(require("vscode"));
class WorkflowPanel {
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (WorkflowPanel.currentPanel) {
            WorkflowPanel.currentPanel.panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(WorkflowPanel.viewType, 'Embedded AI Workflow', column ?? vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media')
            ]
        });
        WorkflowPanel.currentPanel = new WorkflowPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this.disposables = [];
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.update();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(async (message) => {
            try {
                switch (message?.type) {
                    case 'generate-code': {
                        await this.handleGenerateCode(message?.workflow);
                        break;
                    }
                    default:
                        break;
                }
            }
            catch (error) {
                this.postStatus('error', `生成失败: ${error?.message ?? String(error)}`);
                vscode.window.showErrorMessage(`生成失败: ${error?.message ?? String(error)}`);
            }
        }, undefined, this.disposables);
    }
    dispose() {
        WorkflowPanel.currentPanel = undefined;
        // Dispose of the current panel and disposables
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    update() {
        this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
    }
    getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'styles.css'));
        const nonce = getNonce();
        return `<!DOCTYPE html>
		<html lang="zh-CN">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>Embedded AI Workflow</title>
			<link rel="stylesheet" href="${styleUri}" nonce="${nonce}">
		</head>
		<body>
			<div id="app">
				<div class="card">
					<h1>Embedded AI Workflow</h1>
					<p class="subtitle">粘贴/编辑工作流 JSON，点击“生成代码”</p>
					<textarea id="workflowJson" rows="10" spellcheck="false">{
			"nodes": [
				{"id": 1, "type": "GPIO Out", "label": "LED"},
				{"id": 2, "type": "Task", "label": "BlinkTask"}
			],
			"edges": [
				{"from": 2, "to": 1}
			]
		}</textarea>
					<div style="margin-top:12px; display:flex; gap:8px; justify-content:center;">
						<button id="generate" class="button">生成代码</button>
					</div>
					<div id="status" style="margin-top:14px; text-align:left; max-width:680px;"></div>
				</div>
			</div>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>`;
    }
    async handleGenerateCode(workflowJson) {
        this.postStatus('info', '开始生成，正在调用 AI ...');
        const workspaceRoot = this.getWorkspaceFolderUri();
        if (!workspaceRoot) {
            this.postStatus('error', '没有打开的工作区，无法写入生成结果。');
            vscode.window.showErrorMessage('没有打开的工作区，无法写入生成结果。');
            return;
        }
        let manifest = await this.generateWithAi(workflowJson);
        if (!manifest || !Array.isArray(manifest.files)) {
            this.postStatus('warn', 'AI 未返回有效清单，使用本地默认模板。');
            manifest = this.generateMockManifest(workflowJson);
        }
        await this.writeGeneratedFiles(manifest);
        this.postStatus('success', '生成完成，已写入工作区 generated/ 目录。');
        vscode.window.showInformationMessage('代码生成完成，已写入 generated/');
    }
    postStatus(level, text) {
        this.panel.webview.postMessage({ type: 'status', level, text });
    }
    getWorkspaceFolderUri() {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri : undefined;
    }
    async generateWithAi(workflowJson) {
        try {
            const config = vscode.workspace.getConfiguration('embedded-ai-workflow');
            const provider = String(config.get('ai.provider', 'openai'));
            if (provider === 'openai') {
                return await this.generateWithOpenAI(workflowJson);
            }
            if (provider === 'http') {
                return await this.generateWithCustomHttp(workflowJson);
            }
            return await this.generateWithOpenAI(workflowJson);
        }
        catch (error) {
            this.postStatus('warn', `调用 AI 失败，使用默认模板。原因：${error?.message ?? String(error)}`);
            return undefined;
        }
    }
    async generateWithOpenAI(workflowJson) {
        const config = vscode.workspace.getConfiguration('embedded-ai-workflow');
        const baseUrl = String(config.get('ai.openai.baseUrl', 'https://api.openai.com/v1'));
        const model = String(config.get('ai.openai.model', 'gpt-4o-mini'));
        const apiKeyFromConfig = String(config.get('ai.openai.apiKey', ''));
        const apiKey = apiKeyFromConfig || process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            throw new Error('未设置 OpenAI API Key');
        }
        const systemPrompt = [
            '你是资深嵌入式工程师。根据用户提供的工作流 JSON，生成对应的 MCU 工程代码（例如 STM32 HAL C 代码）。',
            '输出一个严格的 JSON 对象（不要包含 Markdown 代码块），格式：',
            '{ "files": [ { "path": "src/main.c", "content": "..." }, ... ] }。',
            '所有路径为相对路径，不要以斜杠开头。不要包含父级目录越界（..）。',
            '将生成内容尽量最小可运行（例如 main.c、CMakeLists.txt 或 Makefile、README.md）。'
        ].join('\n');
        const userPrompt = `工作流 JSON:\n${JSON.stringify(workflowJson, null, 2)}\n\n请基于该工作流生成一个 STM32 HAL C 的最小示例工程（LED 闪烁任务），返回严格 JSON（无 Markdown）。`;
        const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                temperature: 0.1,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`OpenAI 响应错误: ${response.status} ${response.statusText} - ${text}`);
        }
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content ?? '';
        const manifest = this.parseManifest(content);
        if (!manifest) {
            throw new Error('未能从 OpenAI 响应中解析到有效 JSON 清单');
        }
        return manifest;
    }
    async generateWithCustomHttp(workflowJson) {
        const config = vscode.workspace.getConfiguration('embedded-ai-workflow');
        const endpoint = String(config.get('ai.http.endpoint', ''));
        const apiKeyHeader = String(config.get('ai.http.apiKeyHeader', 'Authorization'));
        const apiKey = String(config.get('ai.http.apiKey', ''));
        if (!endpoint) {
            throw new Error('未配置自定义 HTTP 接口地址');
        }
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { [apiKeyHeader]: apiKey } : {})
            },
            body: JSON.stringify({ workflow: workflowJson })
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP 接口错误: ${response.status} ${response.statusText} - ${text}`);
        }
        const data = await response.json();
        if (!data || !Array.isArray(data.files)) {
            throw new Error('自定义 HTTP 接口未返回有效 files 数组');
        }
        return { files: data.files };
    }
    parseManifest(content) {
        try {
            // 尝试直接解析
            return JSON.parse(content);
        }
        catch {
            // 尝试从文本中提取第一个 JSON 对象
            const first = content.indexOf('{');
            const last = content.lastIndexOf('}');
            if (first >= 0 && last > first) {
                const slice = content.slice(first, last + 1);
                try {
                    return JSON.parse(slice);
                }
                catch {
                    return undefined;
                }
            }
            return undefined;
        }
    }
    generateMockManifest(workflowJson) {
        const pretty = JSON.stringify(workflowJson, null, 2);
        const readme = `# Generated by Embedded AI Workflow\n\n此目录包含根据工作流 JSON 生成的示例工程（本地模板，因为未配置 AI 或调用失败）。\n\n## 工作流\n\n\n\n${'```json'}\n${pretty}\n${'```'}\n`;
        const mainC = [
            "#include \"stm32f4xx_hal.h\"",
            "",
            "void SystemClock_Config(void);",
            "static void MX_GPIO_Init(void);",
            "",
            "int main(void)",
            "{",
            "\tHAL_Init();",
            "\tSystemClock_Config();",
            "\tMX_GPIO_Init();",
            "\twhile (1) {",
            "\t\tHAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);",
            "\t\tHAL_Delay(500);",
            "\t}",
            "\treturn 0;",
            "}",
            "",
            "static void MX_GPIO_Init(void)",
            "{",
            "\t__HAL_RCC_GPIOA_CLK_ENABLE();",
            "\tGPIO_InitTypeDef GPIO_InitStruct = {0};",
            "\tGPIO_InitStruct.Pin = GPIO_PIN_5;",
            "\tGPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;",
            "\tGPIO_InitStruct.Pull = GPIO_NOPULL;",
            "\tGPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;",
            "\tHAL_GPIO_Init(GPIOA, &GPIO_InitStruct);",
            "}",
            "",
            "void SystemClock_Config(void) { /* 留空，示例 */ }"
        ].join('\n');
        const cmake = [
            "cmake_minimum_required(VERSION 3.12)",
            "project(embedded_ai_workflow C)",
            "add_executable(embedded_ai_workflow src/main.c)"
        ].join('\n');
        return {
            files: [
                { path: 'README.md', content: readme },
                { path: 'src/main.c', content: mainC },
                { path: 'CMakeLists.txt', content: cmake }
            ]
        };
    }
    async writeGeneratedFiles(manifest) {
        const workspaceRoot = this.getWorkspaceFolderUri();
        if (!workspaceRoot) {
            throw new Error('没有打开的工作区');
        }
        const generatedRoot = vscode.Uri.joinPath(workspaceRoot, 'generated');
        await vscode.workspace.fs.createDirectory(generatedRoot);
        for (const file of manifest.files) {
            const safeRel = this.sanitizeRelativePath(file.path);
            if (!safeRel) {
                this.postStatus('warn', `跳过非法路径: ${file.path}`);
                continue;
            }
            const segments = safeRel.split('/').filter(Boolean);
            const dirSegments = segments.slice(0, -1);
            const targetDir = vscode.Uri.joinPath(generatedRoot, ...dirSegments);
            await vscode.workspace.fs.createDirectory(targetDir);
            const targetFile = vscode.Uri.joinPath(generatedRoot, ...segments);
            await vscode.workspace.fs.writeFile(targetFile, Buffer.from(file.content ?? '', 'utf8'));
            this.postStatus('info', `已写入: generated/${safeRel}`);
        }
    }
    sanitizeRelativePath(p) {
        if (!p || typeof p !== 'string')
            return undefined;
        let s = p.replace(/^[\\/]+/, '');
        if (s.toLowerCase().startsWith('generated/')) {
            s = s.slice('generated/'.length);
        }
        // 标准化为正斜杠
        s = s.replace(/\\/g, '/');
        // 阻止目录越界
        if (s.includes('..'))
            return undefined;
        return s;
    }
}
exports.WorkflowPanel = WorkflowPanel;
WorkflowPanel.viewType = 'embeddedAiWorkflow';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=WorkflowPanel.js.map