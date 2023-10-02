/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
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

		let args : Array<string> = [
			'-v',
			definition.configuration ? (`.@${definition.configuration}`) : "."
		];

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Generate',
			'MPLABX Make',
			new vscode.ProcessExecution(this.paths.mplabxMakePath, args, { 
				cwd: definition.projectFolder
			})
		);
	}

	/** Returns a task that can build an MPLABX Project */
	public getCleanTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

		let args : Array<string> = [];

		if (definition.configuration) {
			args.push(`CONF=\"${definition.configuration}\"`);
		}

		args.push("clean");

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Clean',
			'MPLABX Make',
			new vscode.ProcessExecution(this.paths.mplabxMakePath, args, { 
				cwd: definition.projectFolder
			}),
		);
	}

	/** Returns a task that can build an MPLABX Project */
	public getBuildTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

		let args : Array<string> = [];

		args.push(`CONF=\"${definition?.configuration ?? "default"}\"`);
		
		if (definition?.debug ?? false){
			args.push('TYPE_IMAGE=DEBUG_RUN');
		}

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Build',
			'MPLABX Make',
			new vscode.ProcessExecution(this.paths.mplabxMakePath, args, { 
				cwd: definition.projectFolder
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
