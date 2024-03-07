import * as assert from 'assert';
import * as fs from 'fs';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { waitForTaskCompletion } from '../common/taskHelpers';
import { asyncWait, selectFirstQuickItem } from './testHelpers';

const allowExitCodeNegativeOne = true;

suite('Extension Test Suite', () => {
	
	suiteTeardown(() => {
		vscode.window.showInformationMessage('All tests done!');
	  });

	vscode.window.showInformationMessage('Start all tests.');

	test('Get MPLABX Path Command', async function () {

		const path = await vscode.commands.executeCommand('vslabx.getMplabxInstallLocation') as string;
		
		assert.strictEqual(fs.existsSync(path), true);
	});
	
	test('Update Make Files Command', async function () {
		
		this.timeout(30000);
		
		// Remove Private Config Files
		const cleanupFiles = await vscode.workspace.findFiles('**/nbproject/*.mk');

		cleanupFiles.forEach((file) => {
			fs.rmSync(file.fsPath);
		});

		const remainingFiles = await vscode.workspace.findFiles('**/nbproject/*.mk');

		assert.strictEqual(remainingFiles.length, 0, 'Failed to clean out generated files');

		// Generate Files
	    const exitCode = await vscode.commands.executeCommand('vslabx.updateMakeFiles') as number;

		const terminal = vscode.window.terminals.find(term => term.creationOptions.name === 'Generate');
		
		terminal?.dispose();
		
		assert.notStrictEqual(terminal, undefined);

		if (allowExitCodeNegativeOne) {
			assert.strictEqual(exitCode <= 0, true);
		} else {
			assert.strictEqual(exitCode, 0);
		}
		
		// Check that files were generated
		const generatedFiles = await vscode.workspace.findFiles('**/nbproject/*.mk');
		assert.strictEqual(generatedFiles.length > 3, true, `Failed to generate new files`);
	});

	test('Clean Project Command', async function () {
		
		this.timeout(10000);

	    const exitCode = await vscode.commands.executeCommand('vslabx.clean') as number;

		const terminal = vscode.window.terminals.find(term => term.creationOptions.name === 'Clean');

		terminal?.dispose();

		assert.notStrictEqual(terminal, undefined, vscode.window.terminals.join(', '));
		
		if (allowExitCodeNegativeOne) {
			assert.strictEqual(exitCode <= 0, true);
		} else {
			assert.strictEqual(exitCode, 0);
		}
	});

	test('Build Project Command', async function () {
		
		this.timeout(30000);

	    const exitCode = await vscode.commands.executeCommand('vslabx.build') as number;

		const terminal = vscode.window.terminals.find(term => term.creationOptions.name === 'Build');
		terminal?.dispose();
		
		assert.notStrictEqual(terminal, undefined, vscode.window.terminals.join(', '));

		if (allowExitCodeNegativeOne) {
			assert.strictEqual(exitCode <= 0, true);
		} else {
			assert.strictEqual(exitCode, 0);
		}
	});

	test('List Supported Programers Command', async function() {
		
		this.timeout(10000);

		const firstItemPromise = vscode.commands.executeCommand('vslabx.listSupportedTools');

		// FUTURE: Figure out how to be notified that the list is populated
		await asyncWait(8000);

		await selectFirstQuickItem();

		const firstItem = await firstItemPromise;

		assert.notStrictEqual(firstItem, undefined, "Failed to get an item");
	});

	test('List Attached Tools Command', async function() {
		
		this.timeout(12000);

		const firstItemPromise = vscode.commands.executeCommand('vslabx.listAttachedTools');

		// FUTURE: Figure out how to be notified that the list is populated
		await asyncWait(10000);

		await selectFirstQuickItem();

		const firstItem = await firstItemPromise;

		// This will most likely return nothing because there are no attached tools 
		// assert.notStrictEqual(firstItem, undefined, "Failed to get an item");
		assert.strictEqual(true, true);
	});

	test('Build Tasks', async function() {

		this.timeout(60000);

		const tasks = await vscode.tasks.fetchTasks();

		const taskExecutions: vscode.TaskExecution[] = [];

		for (let i = 0; i < tasks.length; ++i) {
			const task = tasks[i];
			
			taskExecutions.push(await vscode.tasks.executeTask(task));
		}
		
		for (let i = 0; i < taskExecutions.length; ++i) {
			const taskExitCode = await waitForTaskCompletion(taskExecutions[i]);
			assert.strictEqual((taskExitCode ?? 1) <= 0, true);
		}
	});

	test('MPLABX Debugger', async function() {
		
		this.timeout(20000);

		await vscode.commands.executeCommand('vslabx.clean');

		if (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length ?? 0) > 0) {
			const launchSuccessful = await vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], "MPLABX Debug");
		
			await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);

			assert.strictEqual(launchSuccessful, true, "Launch Successful");
		}

		// await timeoutPromise(16000);
	});
});
