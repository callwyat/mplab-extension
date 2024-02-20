/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/*
 * activateMPLABXDebug.ts contains the shared extension code that can be executed both in node.js and the browser.
 */

'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { FileAccessor } from '../common/FileAccessor';
import { DebugProtocol } from '@vscode/debugprotocol';
import { ILaunchRequestArguments } from './mplabxDebug';
import { MplabxConfigFile } from '../common/configFileHelper';
import path = require('path');
import fs = require('fs');
import supportedTools = require('./supportedToolsMap.json');
import { waitForTaskCompletion } from '../common/taskHelpers';


export function activateMplabxDebug(context: vscode.ExtensionContext, debugType: string, factory: vscode.DebugAdapterDescriptorFactory) {

	// register a configuration provider for 'mplabx' debug type
	const provider = new MPLABXConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider(debugType, provider));

	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory(debugType, factory));
}

/**
 * This interface describes the mock-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the mock-debug extension.
 * The interface should always match this schema.
 */
interface ILaunchProjectRequestArguments extends DebugProtocol.LaunchRequestArguments {
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

class MPLABXConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	async resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		switch (config.type) {
			case 'mplabx': default: {
				let projectConfig = config as unknown as ILaunchProjectRequestArguments;
				if (folder) {
					projectConfig.program = projectConfig.program.replace('${workspaceFolder}', folder.uri.fsPath);
				}
				
				if (!projectConfig.configuration) {
					projectConfig.configuration = 'default';
				}

				let result = await this.convertProjectArgs(projectConfig) as unknown as DebugConfiguration;
				return result;
			}
			case 'mdb': {

			}
		}

		return config;
	}

	private async convertProjectArgs(args: ILaunchProjectRequestArguments): Promise<ILaunchRequestArguments | undefined>{

		try {
			
			let project = MplabxConfigFile.readSync(args.program);
			let confs = project.confs.conf;

			// If there is only one configuration, confs is already what we need, otherwise search for a configuration
			let conf = confs.name ? confs : confs.find(c => c.name === args.configuration);

			if (!conf) {
				throw Error(`Failure to find a "${args.configuration}" configuration in ${project}`);
			}

			// Get the tool
			let tool = conf.toolsSet.platformTool;
			const device: string = conf.toolsSet.targetDevice;

			// Find the elf
			let outputFolder = path.join(args.program, 'dist', args.configuration ? args.configuration : 'default', args.debug ? 'debug' : 'production');

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
					if (conf[tool] && programerAllowRegExp) {
						const allowRegex: RegExp = programerAllowRegExp;

						conf[tool].property.forEach((pair) => {
							const key: string = pair.key;
							// Keys with a capital value don't work
							if (key.toLowerCase() === key) {
								const value: string = pair.value;

								// Values with '{' in it, needs resolved... idk how to do
								if (value.length > 0 && !value.match(/(\$\{.+\}|Press\sto|system settings|\.\D)/) &&
									key.match(allowRegex)) {

									toolOptions[key] = value;
								}
							}
						});
					}

					// Convert from a project name to an MDB name. If a name can't be found,
					// try using the project name directly. It probably won't work.
					const mdbTool = supportedTools.find((item) => {
						return item.projectName === tool;
					})?.mdbName ?? tool;

					// Add all the properties to the result to make it work like the mdb args
					args["device"] = device;
					args["toolType"] = mdbTool;
					args["filePath"] = path.join(outputFolder, outputFile);
					args["toolOptions"] = toolOptions;
					args["stopOnEntry"] = args.stopOnEntry;

					return args as unknown as ILaunchRequestArguments;

				} else {
					throw new Error(`Failure to find a "${fileType}" file to write to device`);
				}
			} else {
				throw new Error(`Failure to find the output folder: ${outputFolder}`);
			}
		} catch (e: any) {
			vscode.window.showErrorMessage(e.message);
		}
	}
}

export const workspaceFileAccessor: FileAccessor = {
	async readFile(path: string): Promise<Uint8Array> {
		let uri: vscode.Uri;
		try {
			uri = pathToUri(path);
		} catch (e) {
			return new TextEncoder().encode(`cannot read '${path}'`);
		}

		return await vscode.workspace.fs.readFile(uri);
	},
	async writeFile(path: string, contents: Uint8Array) {
		await vscode.workspace.fs.writeFile(pathToUri(path), contents);
	}
};

function pathToUri(path: string) {
	try {
		return vscode.Uri.file(path);
	} catch (e) {
		return vscode.Uri.parse(path);
	}
}

