import * as vscode from 'vscode';
import { WorkflowPanel } from './panel/WorkflowPanel';

export function activate(context: vscode.ExtensionContext) {
	const openPanel = vscode.commands.registerCommand('workflow.openPanel', () => {
		WorkflowPanel.createOrShow(context.extensionUri);
	});

	context.subscriptions.push(openPanel);
}

export function deactivate() {}

