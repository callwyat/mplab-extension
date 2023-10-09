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
}

class MPLABXConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		switch (config.type) {
			case 'mplabx': default: {
				let projectConfig = config as unknown as ILaunchProjectRequestArguments;
				if (folder) {
					projectConfig.program = projectConfig.program.replace('${workspaceFolder}', folder.uri.fsPath);
				}
				
				let result = this.convertProjectArgs(projectConfig) as unknown as DebugConfiguration;
				return result;
			}
			case 'mdb': {

			}
		}

		return config;
	}

	/** A dictionary translating Configuration tool names to MDB tool names */
	private confToMdBNames = {
		"PICkit3PlatformTool": "PICKit3",
		"pk4hybrid": "PICKit4",
		"pkob4hybrid": "PKOB4",
		"PK5Tool": "pickit5",
		"ri4hybrid": "ICE4",
		"ICD3Tool": "icd3",
		"ICD4Tool": "icd4",
		"ICD5Tool": "icd5",
		"Simulator": "Sim",
		"jlink": "jlink",
	};

	private convertProjectArgs(args: ILaunchProjectRequestArguments): ILaunchRequestArguments | undefined{

		try {
			
			let project = MplabxConfigFile.readSync(args.program);
			let confs = project.confs.conf;

			let conf = confs.find(c => c.name === args.configuration);

			if (!conf) {
				throw Error(`Failure to find a "${args.configuration}" configuration in ${project}`);
			}

			// Get the tool
			let tool = conf.toolsSet.platformTool;
			const device: string = conf.toolsSet.targetDevice;

			// Find the elf
			let outputFolder = path.join(args.program, 'dist', args.configuration ? args.configuration : 'default', args.debug ? 'debug' : 'production');

			const fileType: string = '.elf';

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

					// Convert from a project name to an MDB name
					if (tool in this.confToMdBNames) {
						tool = this.confToMdBNames[tool];
					}

					// Add all the properties to the result to make it work like the mdb args
					args["device"] = device;
					args["toolType"] = tool;
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

