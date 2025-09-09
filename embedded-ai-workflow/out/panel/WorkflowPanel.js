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
        this.output = vscode.window.createOutputChannel('Embedded AI Workflow');
        this.update();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage((message) => {
            switch (message?.type) {
                case 'generateCode': {
                    try {
                        const json = message?.payload ?? {};
                        const nodes = Array.isArray(json?.nodes) ? json.nodes.length : (json?.nodes ? Object.keys(json.nodes).length : 0);
                        const edges = Array.isArray(json?.connections) ? json.connections.length : (json?.connections ? Object.keys(json.connections).length : 0);
                        this.output.appendLine('[Webview] Received workflow JSON:');
                        this.output.appendLine(JSON.stringify(json, null, 2));
                        this.output.show(true);
                        vscode.window.showInformationMessage(`Workflow received: ${nodes} nodes, ${edges} connections`);
                    }
                    catch (err) {
                        vscode.window.showErrorMessage(`Failed to handle workflow JSON: ${String(err)}`);
                    }
                    break;
                }
                default:
                    break;
            }
        }, null, this.disposables);
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
        const vueUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vendor', 'vue.min.js'));
        const reteUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vendor', 'rete.min.js'));
        const connectionPluginUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vendor', 'connection-plugin.min.js'));
        const areaPluginUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vendor', 'area-plugin.min.js'));
        const vueRenderPluginUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vendor', 'vue-render-plugin.min.js'));
        const nonce = getNonce();
        return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}' ${webview.cspSource};">
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>Embedded AI Workflow</title>
			<link rel="stylesheet" href="${styleUri}">
		</head>
		<body>
			<div id="app">
				<div class="toolbar">
					<div class="buttons">
						<button id="add-gpio-in" class="button">GPIO In</button>
						<button id="add-gpio-out" class="button">GPIO Out</button>
						<button id="add-uart" class="button">UART</button>
						<button id="add-task" class="button">Task</button>
					</div>
					<div class="spacer"></div>
					<button id="generate" class="button primary">生成代码</button>
				</div>
				<div id="editor"></div>
			</div>
			<script nonce="${nonce}" src="${vueUri}"></script>
			<script nonce="${nonce}" src="${reteUri}"></script>
			<script nonce="${nonce}" src="${connectionPluginUri}"></script>
			<script nonce="${nonce}" src="${areaPluginUri}"></script>
			<script nonce="${nonce}" src="${vueRenderPluginUri}"></script>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>`;
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