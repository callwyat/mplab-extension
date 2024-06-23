/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/*
 * activateMPLABXDebug.ts contains the shared extension code that can be executed both in node.js and the browser.
 */

'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { MplabxConfigFile } from '../common/configFileHelper';
import path = require('path');
import fs = require('fs');
import supportedTools = require('./supportedToolsMap.json');
import { waitForTaskCompletion } from '../common/taskHelpers';
import { resolvePath } from '../common/vscodeHelpers';


export function activateMplabxDebug(context: vscode.ExtensionContext, factory: vscode.DebugAdapterDescriptorFactory) {

	// register a configuration provider for 'mdb' debug type
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('mdb', new MdbConfigurationProvider()));
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('mdb', factory));

	// register a configuration provider for 'mplabx' debug type
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('mplabx', new MplabxConfigurationProvider()));
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('mplabx', factory));
}

/**
 * This interface describes an MplabxDebugConfiguration
 */
export interface MplabxDebugConfiguration extends DebugConfiguration {
	/** An absolute path to the project to debug. */
	program: string;
	/** The name of the configuration to debug */
	configuration?: string;
	/** Automatically stop target after launch. If not specified, target does not stop. */
	stopOnEntry?: boolean;
	/** Boolean indicating whether to build and launch a debug build or a production build */
	debug?: boolean;
	/** A task to run before running the debugger */
	preLaunchTask?: string;
}

/**
 * This interface describes an MdbDebugConfiguration
 */
export interface MdbDebugConfiguration extends DebugConfiguration {
	/** The part number of the processor to debug (e.g. PIC18F46J50) */
	device: string;
	/** The MDB name of the tool type to use (e.g. Sim, PICKit4, jlink) */
	toolType: string;
	/** The absolute path to the .elf file used for debugging */
	filePath: string;
	/** A dictionary of tool options to set. See the MPLABX configuration file for what is available*/
	toolOptions?: any;
	/** Automatically stop after launch.*/
	stopOnEntry?: boolean;
	/** Enable logging of the Debug Adapter Protocol */
	trace?: boolean
}

export class MdbConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		if (config.type === 'mdb') {
			return config;
		}

		// When creating a new config, an undefined configuration is given
		return new Promise<MdbDebugConfiguration>(async (resolve, reject) => {

			try {
				const device = await vscode.window.showInputBox({
					title: 'Please input the part number to debug',
					placeHolder: 'PIC18F46J53'
				}, token);

				if (!device) {
					throw new Error('Failed to get a device type');
				}

				const toolType = (await vscode.commands.executeCommand('vslabx.listSupportedTools')) as string;

				if (!toolType) {
					throw new Error('Failed to get a tool type');
				}

				const elfPath: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
					filters: { "Elf File": ['.elf'] },
					title: 'Select the ELF File to use'
				});

				if (!elfPath || !elfPath[0]) {
					throw new Error('Failed to get an ELF Path');
				}

				const mdbConfig: MdbDebugConfiguration = {
					type: 'mdb',
					name: 'Microchip Debug Adapter',
					request: "launch",
					device: device,
					toolType: toolType,
					filePath: elfPath[0].fsPath
				};

				resolve(mdbConfig);
			} catch (error) {
				reject(error);
			}
		});
	}
}

export class MplabxConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		// If no configuration is provided, build a contextless config 
		if (config.type !== 'mplabx') {
			config.type = 'mplabx';
			config.name = "MPLABX Debug";
			config.request = "launch";
		}

		const projectConfig = config as MplabxDebugConfiguration;

		if (!projectConfig.program) {
			projectConfig.program = '${workspaceFolder}';
		}

		projectConfig.program = resolvePath(projectConfig.program, folder);

		return convertDebugConfiguration(projectConfig);
	}
}

async function convertDebugConfiguration(args: MplabxDebugConfiguration): Promise<MdbDebugConfiguration> {

	const targetConfig = MplabxConfigFile.getTargetInterface(MplabxConfigFile.readSync(args.program), args.configuration);

	// Find the elf
	let outputFolder = path.join(args.program, 'dist', targetConfig.configurationName, args.debug ? 'debug' : 'production');

	const fileType: string = '.elf';

	// The output folder might not exist yet because the preLaunchTask hasn't ran yet
	if (args.preLaunchTask) {
		const task = (await vscode.tasks.fetchTasks()).find((t => t.name === args.preLaunchTask));

		if (task) {
			const taskExecution = await vscode.tasks.executeTask(task);
			await waitForTaskCompletion(taskExecution);

			// Undefine the task so that it doesn't get ran again
			args.preLaunchTask = undefined;
		}
	}

	if (fs.existsSync(outputFolder)) {
		let outputFiles = fs.readdirSync(outputFolder, { withFileTypes: true })
			.filter(item => item.isFile())
			.filter(item => path.extname(item.name) === fileType);

		if (outputFiles.length > 0) {
			let outputFile = outputFiles[0].name;

			const programerAllowArray = vscode.workspace.getConfiguration('vslabx').get<string[]>('programerToolAllowList');
			const programerAllowRegExp: RegExp | undefined = programerAllowArray && programerAllowArray.length > 0 ?
				RegExp(`(${programerAllowArray?.join('|')})`) : undefined;

			let toolOptions: any = {};

			// Collect all the tool settings
			if (targetConfig.toolOptions && programerAllowRegExp) {
				const allowRegex: RegExp = programerAllowRegExp;

				for (const key in targetConfig.toolOptions) {
					// Keys with a capital value don't work
					if (key.toLowerCase() === key) {
						const value: string = targetConfig.toolOptions[key];

						// Values with '{' in it, needs resolved... idk how to do
						if (value.length > 0 && !value.match(/(\$\{.+\}|Press\sto|system settings|\.\D)/) &&
							key.match(allowRegex)) {

							toolOptions[key] = value;
						}
					}
				};
			}

			// Convert from a project name to an MDB name. If a name can't be found,
			// try using the project name directly. It probably won't work.
			const mdbTool = supportedTools.find((item) => {
				return item.projectName === targetConfig.tool;
			})?.mdbName ?? targetConfig.tool;

			return {
				name: args.name,
				type: 'mdb',
				request: args.request,
				device: targetConfig.device,
				toolType: mdbTool,
				filePath: path.join(outputFolder, outputFile),
				toolOptions: toolOptions,
				stopOnEntry: args.stopOnEntry
			};

		} else {
			throw new Error(`Failure to find a "${fileType}" file to write to device`);
		}
	} else {
		throw new Error(`Failure to find the output folder: ${outputFolder}`);
	}
}
