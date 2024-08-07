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
import os = require('os');
import fs = require('fs');

const defaultString = 'default';

/** Bare bones interface to the supportedToolsMap.json */
interface ToolNameMap {
	/** The name the project files use for the tool */
	projectName: string;
	/** The name MDB uses for the tool */
	mdbName: string;
	/** The name IPE uses for the tool */
	ipeName: string;
}

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
			'VSLABX',
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
			'VSLABX',
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
			'VSLABX',
			new vscode.ProcessExecution(this.paths.mplabxMakePath, args, {
				cwd: definition.projectFolder
			}),
			'$xc'
		);
	}

	/** Returns a task that can build an MPLABX Project */
	public getProgramTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

		let programMode: 'mdb' | 'ipe' = 'mdb';

		if (definition.command === 'mdb' || definition.command === 'ipe') {
			programMode = definition.command;
		} else {
			// Try to figure out from the args what tool the user is trying to use.
			if (definition.args?.find(arg => arg.match(/^-([Oo])/))) {
				programMode = 'ipe';
			}
		}

		let args: string[] = [];

		if (definition.args) {
			args.push(...definition.args);
		}

		let configName: string = defaultString;

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

			// Remove the element from the array
			if (arg) {
				debug = true;
				args.splice(args.indexOf(arg), 1);
			}
		}

		const typeString = debug ? 'debug' : 'production';

		const projectPath = resolvePath(definition.projectFolder, scope as vscode.WorkspaceFolder);

		const projectName = path.basename(projectPath);

		// The absolute path to the hex file is used because changing the working directory didn't work all the time
		let hexPath: string = path.join(projectPath, 'dist', configName,
			typeString, `${projectName}.${typeString}.hex`);

		args.unshift((programMode === 'ipe' ? '-F' : 'program ') + hexPath);

		const targetConfig = MplabxConfigFile.getTargetInterface(MplabxConfigFile.readSync(projectPath), configName);

		// If the user didn't specify a tool, grab it from the project
		if (!args.find(arg => arg.match(/-T[PS].*/))) {
			// Convert from a project name to an IPE name. If a name can't be found,
			// try using the project name directly. It probably won't work.
			const toolMap: ToolNameMap = supportedTools.find((item) => {
				return item.projectName === targetConfig.tool;
			}) ?? {
				projectName: targetConfig.tool,
				mdbName: targetConfig.tool,
				ipeName: targetConfig.tool
			};

			args.unshift(programMode === 'ipe' ? `-TP${toolMap.ipeName}` : `hwtool ${toolMap.mdbName} -p`);
		}

		const deviceMatch = targetConfig.device.match(/\d.*/);

		const device = deviceMatch ? deviceMatch[0] : targetConfig.device;
		args.unshift(programMode === 'ipe' ? `-P${device}` : `device ${targetConfig.device}`);

		const execution = this.getToolTask({
			type: "vslabx",
			command: programMode,
			args: args
		}).execution as vscode.ProcessExecution;

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Program',
			'VSLABX',
			new vscode.ProcessExecution(execution.process, execution.args, {
				cwd: path.dirname(execution.process)
			}),
			'$xc'
		);
	}

	/**
	 * Creates a task that utilizes one of the mplabx executables mapped by this extension
	 * @param definition What command and args to use
	 * @param scope Scope
	 * @returns A task
	 */
	public getToolTask(definition: MpToolTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {

		var executablePath: string;
		let args: string[] = [];

		if (definition.args) {
			// Resolve any references that may exist
			for (let i = 0; i < definition.args.length; i++) {
				args.push(resolvePath(definition.args[i], scope as vscode.WorkspaceFolder));
			}
		}

		const options = {
			cwd: definition.projectFolder
		};

		switch (definition.command) {
			case 'mdb':
				executablePath = this.paths.mplabxDebuggerPath;

				if (vscode.workspace.getConfiguration('vslabx').get<boolean>('mdbCommandArgsRedirectToScript', true)) {
					const scriptPath = path.join(os.tmpdir(), 'vslabx.mdb');

					// Make sure that the mdb quits at the end
					args.push('quit');
					fs.writeFileSync(scriptPath, args.join('\n'));
					args = [scriptPath];
				}
				break;

			case 'ipe':
				executablePath = this.paths.mplabxIpecmdPath;

				// The IPE only seam to work when the working directory is the parent of the executable
				options.cwd = path.dirname(executablePath);
				break;

			case 'make':
				executablePath = this.paths.mplabxMakePath;
				break;

			case 'makeFileGenerator':
				executablePath = this.paths.mplabxMakefileGeneratorPath;
				break;
		}

		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'MPLABX Command',
			'VSLABX',
			new vscode.ProcessExecution(executablePath, args, options),
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

	/**
	 * The name of the command to use when running the program task
	 */
	command?: string;

	/** Additional arguments to pass into the make command */
	args?: string[];
}


export interface MpToolTaskDefinition extends vscode.TaskDefinition {

	/** The command to use when sending the program */
	command: 'make' | 'makeFileGenerator' | 'mdb' | 'ipe';

	/** Additional arguments to pass into the programming command */
	args?: string[];
}