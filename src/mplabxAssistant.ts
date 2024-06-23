/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
import * as vscode from 'vscode';
import { MPLABXPaths } from './common/mplabPaths';
import { MplabxConfigFile } from './common/configFileHelper';
import { resolvePath } from './common/vscodeHelpers';

import supportedTools = require('./debugAdapter/supportedToolsMap.json');
import path = require('path');

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

		let args: Array<string> = [
			'-v',
			definition.projectFolder
		];

		if (definition.configuration) {
			args[1] += `@"${definition.configuration}"`;
		}

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

		let args: string[] = [];

		if (definition.args) {
			args.push(...definition.args);
		}

		if (definition.configuration) {
			args.push(`CONF=\"${definition.configuration}\"`);
		}

		return args;
	}

	/** Returns a task that can build an MPLABX Project */
	public getCleanTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

		let args: string[] = this.createMakeArgs(definition);

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

		let args: string[] = this.createMakeArgs(definition);

		if (definition?.debug ?? false) {
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

	/** Returns a task that can build an MPLABX Project */
	public getProgramTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

		let args: string[] = [];

		if (definition.args) {
			args.push(...definition.args);
		}

		let configName: string = 'default';

		if (definition?.configuration) {
			configName = definition.configuration;
		} else {
			const arg = definition.args?.find(arg => {
				const argMatch = arg.match(/CONF=\"?(?<configName>[^\"]*)\"?/);
				if (argMatch?.groups) {
					configName = argMatch.groups.configName;
					return true;
				}
			});

			// Remove the element from the the array
			if (arg) {
				args.splice(args.indexOf(arg), 1);
			}
		}

		let debug: boolean = false;

		if (definition.debug) {
			debug = true;
		} else {
			const arg = definition.args?.find(arg => arg.match(/TYPE_IMAGE=DEBUG_RUN/));

			if (arg) {
				debug = true;
				args.splice(args.indexOf(arg), 1);
			}
		}

		const typeString = debug ? 'debug' : 'production';

		const projectPath = resolvePath(definition.projectFolder, scope as vscode.WorkspaceFolder);

		const projectName = path.basename(projectPath);

		// The working directory is changed to the projectPath, so a relative path will work here
		let hexPath: string = path.join(projectPath, 'dist', configName,
			typeString, `${projectName}.${typeString}.hex`);

		args.unshift(`-F${hexPath}`);

		const targetConfig = MplabxConfigFile.getTargetInterface(MplabxConfigFile.readSync(projectPath), configName);

		// If the user didn't specify a tool, grab it from the project
		if (!args.find(arg => arg.match(/-T[PS].*/))) {
			// Convert from a project name to an IPE name. If a name can't be found,
			// try using the project name directly. It probably won't work.
			const ipeTool = supportedTools.find((item) => {
				return item.projectName === targetConfig.tool;
			})?.ipeName ?? targetConfig.tool;

			args.unshift(`-TP${ipeTool}`);
		}

		const deviceMatch = targetConfig.device.match(/\d.*/);

		const device = deviceMatch ? deviceMatch[0] : targetConfig.device;
		args.unshift(`-P${device}`);

		const executablePath = this.paths.mplabxIpecmdPath;

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Build',
			'MPLABX Make',
			new vscode.ProcessExecution(executablePath, args, {
				cwd: path.dirname(executablePath)
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

	/** 
	 * The name of the configuration to use. Available configurations are found in the configuration.xml file 
	 * @deprecated Replaced by adding `CONF=\"{configurationName}\"` to the `args`.
	 */
	configuration?: string;

	/** 
	 * When true, the project will build for debugging. 
	 * @deprecated Replaced by adding `TYPE_IMAGE=DEBUG_RUN` to the `args.
	 */
	debug?: boolean;

	/** Additional arguments to pass into the make command */
	args?: string[];
}
