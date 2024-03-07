
import * as vscode from 'vscode';

/**
 * Waits for the given time
 * @param milliSeconds How long to pause for (in milliseconds)
 * @returns A promise that will resolve in the given timeout
 */
export async function asyncWait(milliSeconds: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, milliSeconds);
	});
}

/**
 * Selects the first item in a quick pick and accepts it
 */
export async function selectFirstQuickItem() {
    await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext');
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
}