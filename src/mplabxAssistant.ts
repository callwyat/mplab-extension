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
			definition.configuration ? (`.@\"{definition.configuration}\"`) : "."
		];

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Generate',
			'MPLABX Make',
			new vscode.ProcessExecution(this.paths.mplabxMakefileGeneratorPath, args, { 
				cwd: definition.projectFolder
			})
		);
	}

	/** Creates the augments for the make command */
	private createMakeArgs(definition: MpMakeTaskDefinition): string[] {

		let args : string[] = [];

		if (definition.makeArguments) {
			definition.makeArguments.forEach(arg => args.push(arg));
		}

		if (definition.configuration) {
			args.push(`CONF=\"${definition.configuration}\"`);
		}

		return args;
	}

	/** Returns a task that can build an MPLABX Project */
	public getCleanTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

		let args : string[]  = this.createMakeArgs(definition);

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

		let args : string[] = this.createMakeArgs(definition);
		
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

/**
 * The arguments needed to run the MPLABX 'make' command
 */
export interface MpMakeTaskDefinition extends vscode.TaskDefinition {
	/** The folder that contains the nbproject/configuration.xml */
	projectFolder: string;

	/** The name of the configuration to use. Available configurations are found in the configuration.xml file */
	configuration?: string;

	/** When true, the project will build for debugging. */
	debug?: boolean;

	/** Additional arguments to pass into the make command */
	makeArguments?: string[];
}
