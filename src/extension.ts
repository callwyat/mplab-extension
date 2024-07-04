/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/*
 * extension.ts (and activateMockDebug.ts) forms the "plugin" that plugs into VS Code and contains the code that
 * connects VS Code with the debug adapter.
 * 
 * extension.ts contains code for launching the debug adapter in three different ways:
 * - as an external program communicating with VS Code via stdin/stdout,
 * - as a server process communicating with VS Code via sockets or named pipes, or
 * - as inlined code running in the extension itself (default).
 * 
 * Since the code in extension.ts uses node.js APIs it cannot run in the browser.
 */

'use strict';

import * as Net from 'net';
import * as vscode from 'vscode';
import { ProviderResult } from 'vscode';
import { MdbDebugSession } from './debugAdapter/mplabxDebug';
import { activateMplabxDebug } from './debugAdapter/activateMplabxDebug';
import { MPLABXAssistant, MpMakeTaskDefinition, MpToolTaskDefinition } from './mplabxAssistant';
import { MPLABXPaths } from './common/mplabPaths';
import { MDBCommunications } from './debugAdapter/mdbCommunications';
import { waitForTaskCompletion } from './common/taskHelpers';

/*
 * The compile time flag 'runMode' controls how the debug adapter is run.
 * Please note: the test suite only supports 'external' mode.
 */
const runMode: 'external' | 'server' | 'namedPipeServer' | 'inline' = 'server';

const mplabxAssistant = new MPLABXAssistant();

export function activate(context: vscode.ExtensionContext) {

	// debug adapters can be run in different ways by using a vscode.DebugAdapterDescriptorFactory:
	switch (runMode) {
		case 'server': default:
			// run the debug adapter as a server inside the extension and communicate via a socket
			activateMplabxDebug(context, new MdbDebugAdapterServerDescriptorFactory());
			break;

		case 'inline':
			// run the debug adapter inside the extension and directly talk to it
			activateMplabxDebug(context, new MdbInlineDebugAdapterFactory());
			break;
	}

	context.subscriptions.push(

		vscode.commands.registerCommand('vslabx.getMplabxInstallLocation', config => {
			return new MPLABXPaths().mplabxFolder;
		}),

		vscode.commands.registerCommand('vslabx.updateMakeFiles', async () => {

			const projectPath = await selectMplabxProjectFolder();

			if (projectPath) {
				const task = await vscode.tasks.executeTask(mplabxAssistant.getGenerateMakeFileConfigTask({
					projectFolder: projectPath,
					type: 'generate'
				}));


				return await waitForTaskCompletion(task);
			}
		}),

		vscode.commands.registerCommand('vslabx.clean', async () => {

			const projectPath = await selectMplabxProjectFolder();

			if (projectPath) {
				const task = await vscode.tasks.executeTask(mplabxAssistant.getCleanTask({
					projectFolder: projectPath,
					type: 'clean'
				}));

				return await waitForTaskCompletion(task);
			}
		}),

		vscode.commands.registerCommand('vslabx.build', async () => {

			const projectPath = await selectMplabxProjectFolder();
			if (projectPath) {
				const task = await vscode.tasks.executeTask(mplabxAssistant.getBuildTask({
					projectFolder: projectPath,
					type: 'build'
				}));

				return await waitForTaskCompletion(task);
			}
		}),

		vscode.commands.registerCommand('vslabx.program', async () => {

			const projectPath = await selectMplabxProjectFolder();
			if (projectPath) {
				const task = await vscode.tasks.executeTask(mplabxAssistant.getProgramTask({
					projectFolder: projectPath,
					type: 'program'
				}));

				return await waitForTaskCompletion(task);
			}
		}),

		vscode.commands.registerCommand('vslabx.listSupportedTools', async title => {

			let mdb = new MDBCommunications(new MPLABXPaths().mplabxDebuggerPath);
			return await vscode.window.showQuickPick(
				mdb.getSupportedProgramers().then((supportedProgramers) => {

					return supportedProgramers.map(item => {
						return {
							label: item.name,
							description: item.description
						};
					});
				}).finally(() => {
					mdb.quit();
				}), { title: title ?? 'MDB: Supported Tool Types' });
		}),

		vscode.commands.registerCommand('vslabx.listAttachedTools', title => {

			let mdb = new MDBCommunications(new MPLABXPaths().mplabxDebuggerPath);
			return vscode.window.showQuickPick(
				mdb.getAttachedProgramers().then((attachedProgramers) => {

					return attachedProgramers.map(item => {
						return {
							label: `${item.index}: ${item.name}`,
							description: item.type,
							detail: `Serial Number: ${item.serialNumber}\tIP Address: ${item.ipAddress}`
						};
					});
				}).finally(() => {
					mdb.quit();
				}), { title: title ?? 'MDB: Attached Tools' });
		}),

		vscode.tasks.registerTaskProvider('mplabx', {
			provideTasks(token?: vscode.CancellationToken) {
				return [];
			},
			resolveTask(_task: vscode.Task): vscode.Task | undefined {
				const task = _task.definition.task;
				if (task) {
					const definition: MpMakeTaskDefinition = <any>_task.definition;

					switch (task) {
						case 'build':
							return mplabxAssistant.getBuildTask(definition, _task.scope);

						case 'clean':
							return mplabxAssistant.getCleanTask(definition, _task.scope);

						case 'program':
							return mplabxAssistant.getProgramTask(definition, _task.scope);
					}
				}
			}
		}),
		vscode.tasks.registerTaskProvider('mplabx-command', {
			provideTasks(token?: vscode.CancellationToken) {
				return [];
			},
			resolveTask(_task: vscode.Task): vscode.Task | undefined {
				
				const definition: MpToolTaskDefinition = <any>_task.definition;

				return mplabxAssistant.getToolTask(definition, _task.scope);
			}
		}),
	);
}

async function selectMplabxProjectFolder(): Promise<string | undefined> {

	return mplabxAssistant.findMplabxProjectFolders().then((paths) => {

		if (paths.length === 0) {
			throw new Error("Failed to find an MPLABX Makefile");
		} else if (paths.length === 1) {
			return paths[0];
		} else {
			return vscode.window.showQuickPick(paths, { canPickMany: false });
		}
	});

}

export function deactivate() {
}

class MdbDebugAdapterServerDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {

	private server?: Net.Server;

	createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new MdbDebugSession();
				session.setRunAsServer(true);
				session.start(socket as NodeJS.ReadableStream, socket);
			}).listen(0);
		}

		// make VS Code connect to debug server
		return new vscode.DebugAdapterServer((this.server.address() as Net.AddressInfo).port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}

class MdbInlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {

	createDebugAdapterDescriptor(_session: vscode.DebugSession): ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new MdbDebugSession());
	}
}

