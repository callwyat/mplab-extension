/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
import { windows, linux, macos } from 'platform-detect';
import * as vscode from 'vscode';
import { MPLABXPaths } from './common/mplabPaths';

/** A helper class for finding all the MPLABX things */
export class MPLABXAssistant {

	private paths: MPLABXPaths = new MPLABXPaths();

	/** Finds folders end with ".X" and contain a Makefile  
	 * @param token An optional cancellation token
	*/
	public async findMplabxProjectFolders(token?: vscode.CancellationToken): Promise<string[]> {
		return vscode.workspace.findFiles('**/Makefile', "", 20, token)
			.then((us) => us.map((u) => {
				let p: string = u.fsPath.replace("Makefile", "");
				return p.substring(0, p.length - 1);
			}));
	}


	/** Returns a task that can build an MPLABX Project */
	public getGenerateMakeFileConfigTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

			let command: string = `${this.paths.mplabxMakefileGeneratorPath} -v ` +
			(definition.configuration ? (`.@${definition.configuration}\"`) : ".");

			if (windows) {
				command = `"${command}"`;
			}

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Generate',
			'MPLABX Make',
			new vscode.ShellExecution(command,
					{ 
					cwd: definition.projectFolder,
					executable: windows ? 'cmd' : undefined,
					shellArgs: windows ? ['/d', '/c'] : undefined
				})
		);
	}

	/** Returns a task that can build an MPLABX Project */
	public getCleanTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

			let command: string = this.paths.mplabxMakePath + 
				(definition.configuration ? (` CONF=\"${definition.configuration}\"`) : "") +
				" clean";

			if (windows) {
				command = `"${command}"`;
			}

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Clean',
			'MPLABX Make',
			new vscode.ShellExecution(command,
				 { 
					cwd: definition.projectFolder,
					executable: windows ? 'cmd' : undefined,
					shellArgs: windows ? ['/d', '/c'] : undefined
				})
		);
	}

	/** Returns a task that can build an MPLABX Project */
	public getBuildTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

			let config = definition?.configuration ?? "default";

			let debugString = definition?.debug ?? false ? ' TYPE_IMAGE=DEBUG_RUN' : '';

			let command: string = `${this.paths.mplabxMakePath} CONF=\"${config}\"${debugString}`;

			if (windows) {
				command = `"${command}"`;
			}

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Build',
			'MPLABX Make',
			new vscode.ShellExecution(command,
				 { 
					cwd: definition.projectFolder,
					executable: windows ? 'cmd' : undefined,
					shellArgs: windows ? ['/d', '/c'] : undefined
				}),
			'$xc'
		);
	}
}

export interface MpMakeTaskDefinition extends vscode.TaskDefinition {
	projectFolder: string;
	configuration?: string;
	debug?: boolean;
}
