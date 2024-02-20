
import * as vscode from 'vscode';

export async function waitForTaskCompletion(taskExecution: vscode.TaskExecution): Promise<number | undefined> {

	return new Promise<number | undefined>(resolve => {
		vscode.tasks.onDidEndTaskProcess(endEvent => {
			if (taskExecution === endEvent.execution) {
				resolve(endEvent.exitCode);
			}
		});
	});
}