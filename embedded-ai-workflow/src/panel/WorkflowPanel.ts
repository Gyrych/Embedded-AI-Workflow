import * as vscode from 'vscode';
import { GeneratedManifest, TargetPlatform } from '../types';

export class WorkflowPanel {
	public static readonly viewType = 'embeddedAiWorkflow';
	private static currentPanel: WorkflowPanel | undefined;

	private readonly panel: vscode.WebviewPanel;
	private readonly extensionUri: vscode.Uri;
	private disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (WorkflowPanel.currentPanel) {
			WorkflowPanel.currentPanel.panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			WorkflowPanel.viewType,
			'Embedded AI Workflow',
			column ?? vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.joinPath(extensionUri, 'media')
				]
			}
		);

		WorkflowPanel.currentPanel = new WorkflowPanel(panel, extensionUri);
	}

	private async handleImportWorkflow() {
		const uris = await vscode.window.showOpenDialog({
			title: '选择工作流 JSON 文件',
			filters: { 'JSON': ['json'] },
			canSelectMany: false,
			openLabel: '导入'
		});
		if (!uris || uris.length === 0) return;
		const uri = uris[0];
		try {
			const buf = await vscode.workspace.fs.readFile(uri);
			const text = Buffer.from(buf).toString('utf8');
			const parsed = JSON.parse(text);
			this.panel.webview.postMessage({ type: 'workflow-loaded', workflow: parsed });
		} catch (e: any) {
			this.postStatus('error', `导入失败：${e?.message ?? String(e)}`);
		}
	}

	private async handleExportWorkflow(workflowJson: unknown) {
		const workspaceRoot = this.getWorkspaceFolderUri();
		const defaultUri = workspaceRoot ? vscode.Uri.joinPath(workspaceRoot, 'workflow.json') : undefined;
		const uri = await vscode.window.showSaveDialog({
			title: '保存工作流 JSON',
			filters: { 'JSON': ['json'] },
			defaultUri
		});
		if (!uri) return;
		try {
			const text = JSON.stringify(workflowJson ?? {}, null, 2);
			await vscode.workspace.fs.writeFile(uri, Buffer.from(text, 'utf8'));
			this.panel.webview.postMessage({ type: 'save-complete' });
		} catch (e: any) {
			this.postStatus('error', `导出失败：${e?.message ?? String(e)}`);
		}
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this.panel = panel;
		this.extensionUri = extensionUri;

		this.update();

		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		this.panel.webview.onDidReceiveMessage(async (message) => {
			try {
				switch (message?.type) {
					case 'generate-code': {
						const platform = this.normalizePlatform(message?.platform);
						await this.handleGenerateCode(message?.workflow, platform);
						break;
					}
					case 'import-workflow': {
						await this.handleImportWorkflow();
						break;
					}
					case 'export-workflow': {
						await this.handleExportWorkflow(message?.workflow);
						break;
					}
					default:
						break;
				}
			} catch (error: any) {
				this.postStatus('error', `生成失败: ${error?.message ?? String(error)}`);
				vscode.window.showErrorMessage(`生成失败: ${error?.message ?? String(error)}`);
			}
		}, undefined, this.disposables);
	}

	public dispose() {
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

	private update() {
		this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
	}

	private getHtmlForWebview(webview: vscode.Webview) {
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js')
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'media', 'styles.css')
		);

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
				<div class="card" style="display:grid; grid-template-columns: 260px 1fr; gap:16px; align-items:start;">
					<div class="panel sidebar" style="border-right: 1px solid #1f2937; padding-right: 16px;">
						<h3 style="margin:0 0 8px 0">节点库</h3>
						<div id="nodeLibrary" style="display:grid; gap:8px;">
							<button class="button node" data-node-type="GPIO Out" data-node-label="LED">➕ GPIO Out</button>
							<button class="button node" data-node-type="Task" data-node-label="Task">➕ Task</button>
							<button class="button node" data-node-type="Timer" data-node-label="Timer">➕ Timer</button>
							<button class="button node" data-node-type="UART" data-node-label="UART">➕ UART</button>
						</div>
						<hr style="border:none; border-top:1px solid #1f2937; margin:12px 0"/>
						<div style="display:grid; gap:6px;">
							<label for="platform" style="text-align:left; color:#9ca3af;">目标平台</label>
							<select id="platform" class="select">
								<option value="stm32-hal">STM32 HAL</option>
								<option value="esp-idf">ESP-IDF</option>
							</select>
						</div>
						<hr style="border:none; border-top:1px solid #1f2937; margin:12px 0"/>
						<div style="display:grid; gap:8px;">
							<button id="importJson" class="button">导入 JSON</button>
							<button id="exportJson" class="button">导出 JSON</button>
						</div>
					</div>

					<div class="panel main" style="padding-left: 8px;">
						<h1>Embedded AI Workflow</h1>
						<p class="subtitle">编辑工作流 JSON 或从节点库添加节点，然后生成代码</p>
						<textarea id="workflowJson" rows="16" spellcheck="false">{
			"nodes": [
				{"id": 1, "type": "GPIO Out", "label": "LED"},
				{"id": 2, "type": "Task", "label": "BlinkTask"}
			],
			"edges": [
				{"from": 2, "to": 1}
			]
		}</textarea>
						<div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-start;">
							<button id="generate" class="button">生成代码</button>
						</div>
						<div id="status" style="margin-top:14px; text-align:left; max-width:900px;"></div>
					</div>
				</div>
			</div>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>`;
	}

	private async handleGenerateCode(workflowJson: unknown, platform: TargetPlatform | undefined) {
		this.postStatus('info', '开始生成，正在调用 AI ...');
		const workspaceRoot = this.getWorkspaceFolderUri();
		if (!workspaceRoot) {
			this.postStatus('error', '没有打开的工作区，无法写入生成结果。');
			vscode.window.showErrorMessage('没有打开的工作区，无法写入生成结果。');
			return;
		}

		const chosen = this.normalizePlatform(platform);
		let manifest = await this.generateWithAi(workflowJson, chosen);
		if (!manifest || !Array.isArray(manifest.files)) {
			this.postStatus('warn', 'AI 未返回有效清单，使用本地默认模板。');
			manifest = this.generateMockManifest(workflowJson, chosen);
		}

		manifest = this.addPlatformBuildFiles(manifest, chosen);
		await this.writeGeneratedFiles(manifest);
		this.postStatus('success', '生成完成，已写入工作区 generated/ 目录。');
		vscode.window.showInformationMessage('代码生成完成，已写入 generated/');
	}

	private normalizePlatform(platform?: unknown): TargetPlatform {
		const v = String(platform || '').toLowerCase();
		if (v === 'esp-idf') return 'esp-idf';
		return 'stm32-hal';
	}

	private postStatus(level: 'info' | 'warn' | 'error' | 'success', text: string) {
		this.panel.webview.postMessage({ type: 'status', level, text });
	}

	private getWorkspaceFolderUri(): vscode.Uri | undefined {
		const folders = vscode.workspace.workspaceFolders;
		return folders && folders.length > 0 ? folders[0].uri : undefined;
	}

	private async generateWithAi(workflowJson: unknown, platform: TargetPlatform): Promise<GeneratedManifest | undefined> {
		try {
			const config = vscode.workspace.getConfiguration('embedded-ai-workflow');
			const provider = String(config.get('ai.provider', 'openai'));
			if (provider === 'openai') {
				return await this.generateWithOpenAI(workflowJson, platform);
			}
			if (provider === 'http') {
				return await this.generateWithCustomHttp(workflowJson, platform);
			}
			return await this.generateWithOpenAI(workflowJson, platform);
		} catch (error) {
			this.postStatus('warn', `调用 AI 失败，使用默认模板。原因：${(error as any)?.message ?? String(error)}`);
			return undefined;
		}
	}

	private async generateWithOpenAI(workflowJson: unknown, platform: TargetPlatform): Promise<GeneratedManifest> {
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

		const platformText = platform === 'esp-idf' ? 'ESP-IDF C/C++' : 'STM32 HAL C';
		const userPrompt = `工作流 JSON:\n${JSON.stringify(workflowJson, null, 2)}\n\n目标平台：${platformText}\n\n请基于该工作流生成一个最小示例工程（例如 LED 闪烁任务），返回严格 JSON（无 Markdown）。`;

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

		const data: any = await response.json();
		const content: string = data?.choices?.[0]?.message?.content ?? '';
		const manifest = this.parseManifest(content);
		if (!manifest) {
			throw new Error('未能从 OpenAI 响应中解析到有效 JSON 清单');
		}
		return manifest;
	}

	private async generateWithCustomHttp(workflowJson: unknown, platform: TargetPlatform): Promise<GeneratedManifest> {
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
			body: JSON.stringify({ workflow: workflowJson, platform })
		});
		if (!response.ok) {
			const text = await response.text();
			throw new Error(`HTTP 接口错误: ${response.status} ${response.statusText} - ${text}`);
		}
		const data: any = await response.json();
		if (!data || !Array.isArray(data.files)) {
			throw new Error('自定义 HTTP 接口未返回有效 files 数组');
		}
		return { files: data.files };
	}

	private parseManifest(content: string): { files: { path: string; content: string }[] } | undefined {
		try {
			// 尝试直接解析
			return JSON.parse(content);
		} catch {
			// 尝试从文本中提取第一个 JSON 对象
			const first = content.indexOf('{');
			const last = content.lastIndexOf('}');
			if (first >= 0 && last > first) {
				const slice = content.slice(first, last + 1);
				try {
					return JSON.parse(slice);
				} catch {
					return undefined;
				}
			}
			return undefined;
		}
	}

	private generateMockManifest(workflowJson: unknown, platform: TargetPlatform): GeneratedManifest {
		const pretty = JSON.stringify(workflowJson, null, 2);
		const readme = `# Generated by Embedded AI Workflow\n\n此目录包含根据工作流 JSON 生成的示例工程（本地模板，因为未配置 AI 或调用失败）。\n\n## 工作流\n\n\n\n${'```json'}\n${pretty}\n${'```'}\n`;
		if (platform === 'esp-idf') {
			const mainC = [
				"#include \"freertos/FreeRTOS.h\"",
				"#include \"freertos/task.h\"",
				"#include \"driver/gpio.h\"",
				"",
				"#define LED_GPIO GPIO_NUM_2",
				"",
				"void app_main(void)",
				"{",
				"\tgpio_reset_pin(LED_GPIO);",
				"\tgpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);",
				"\twhile (1) {",
				"\t\tgpio_set_level(LED_GPIO, 1);",
				"\t\tvTaskDelay(pdMS_TO_TICKS(500));",
				"\t\tgpio_set_level(LED_GPIO, 0);",
				"\t\tvTaskDelay(pdMS_TO_TICKS(500));",
				"\t}",
				"}"
			].join('\n');
			const rootCMake = [
				"cmake_minimum_required(VERSION 3.5)",
				"include($ENV{IDF_PATH}/tools/cmake/project.cmake)",
				"project(embedded_ai_workflow)"
			].join('\n');
			const mainCMake = [
				"idf_component_register(SRCS \"main.c\" INCLUDE_DIRS \".\")"
			].join('\n');
			return {
				files: [
					{ path: 'README.md', content: readme },
					{ path: 'main/main.c', content: mainC },
					{ path: 'CMakeLists.txt', content: rootCMake },
					{ path: 'main/CMakeLists.txt', content: mainCMake }
				]
			};
		}
		// default STM32 HAL mock
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

	private addPlatformBuildFiles(manifest: GeneratedManifest, platform: TargetPlatform): GeneratedManifest {
		const files = [...manifest.files];
		const hasCMake = files.some(f => /(^|\/)CMakeLists\.txt$/.test(f.path));
		const hasPio = files.some(f => /(^|\/)platformio\.ini$/.test(f.path));
		if (platform === 'stm32-hal') {
			if (!hasCMake && !hasPio) {
				files.push({
					path: 'CMakeLists.txt',
					content: [
						'cmake_minimum_required(VERSION 3.12)',
						'project(embedded_ai_workflow C)',
						'add_executable(embedded_ai_workflow src/main.c)'
					].join('\n')
				});
			}
		} else if (platform === 'esp-idf') {
			if (!hasCMake) {
				files.push({ path: 'CMakeLists.txt', content: [
					'cmake_minimum_required(VERSION 3.5)',
					'include($ENV{IDF_PATH}/tools/cmake/project.cmake)',
					'project(embedded_ai_workflow)'
				].join('\n') });
			}
			if (!hasPio) {
				files.push({ path: 'platformio.ini', content: [
					'[env:esp32dev]',
					'platform = espressif32',
					'board = esp32dev',
					'framework = espidf',
					'build_flags = -std=gnu++17'
				].join('\n') });
			}
		}
		return { files };
	}

	private async writeGeneratedFiles(manifest: { files: { path: string; content: string }[] }) {
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

	private sanitizeRelativePath(p: string): string | undefined {
		if (!p || typeof p !== 'string') return undefined;
		let s = p.replace(/^[\\/]+/, '');
		if (s.toLowerCase().startsWith('generated/')) {
			s = s.slice('generated/'.length);
		}
		// 标准化为正斜杠
		s = s.replace(/\\/g, '/');
		// 阻止目录越界
		if (s.includes('..')) return undefined;
		return s;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

