/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
import { windows, linux, macos } from 'platform-detect';
import path = require('path');
import fs = require('fs');
import xml2js = require('xml2js');
import { ChildProcess, spawn } from 'child_process';
import { Mutex } from 'async-mutex';
import * as vscode from 'vscode';

/** A helper class for finding all the MPLABX things */
export class MPLABXAssistant {

	private disposed: boolean = false;
	private _mdbProcess: ChildProcess;
	private _vscodeMdbOutput: vscode.OutputChannel;
	private _mdbMutex: Mutex = new Mutex();

	private version: string | undefined;

	/**
	 * A helper class for all things MPLABX
	 * @param version Specifies the version to use, or leave undefined to use the latest version
	 */
	constructor(version?: string) {
		this.version = version;

		{
			this._vscodeMdbOutput = vscode.window.createOutputChannel('MPLABX Debugger');
			
			this._mdbProcess = spawn(this.mplabxDebuggerPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
			this._vscodeMdbOutput?.appendLine(`--- Started Microchip Debugger ---`);

			this._mdbProcess.stderr?.on('data', (error) => {
				this._vscodeMdbOutput?.appendLine(`[Error] ${error}`);
			});

			this._mdbProcess.stdout?.on('data', (data: String) => {
				this._vscodeMdbOutput?.append(`${data}`);
			});

			this._mdbProcess.on('close', (code) => {
				this._vscodeMdbOutput?.appendLine(`--- Microchip Debugger exited with code ${code} ---`);
			});

			// Wait for the Microchip Debugger to start up.
			this._mdbMutex.runExclusive(() => this.readResultFromDebugger());
		}
	}

	private _mplabxLocation: string = '';

	/** Finds the absolute path to the latest installed version of MPLABX */
	get mplabxFolder(): string {

		if (this._mplabxLocation === '') {
			let result = '' as string;
			if (macos) {
				result = '/Applications/microchip/mplabx';
			} else if (windows) {
				result = 'c:\\Program Files\\Microchip\\MPLABX';
				if (!fs.existsSync(result)) {
					result = 'c:\\Program Files (x86)\\Microchip\\MPLABX';
				}
			} else if (linux) {
				result = '/opt/microchip/mplabx';
			} else {
				throw new Error(`lookup error: unknown operating system.`);
			}

			if (this.version) {
				result = path.join(result, `v${this.version}`);
			} else {
				// find the latest installed version
				try {
					if (fs.existsSync(result)) {
						const directories = fs.readdirSync(result, { withFileTypes: true })
							.filter((item) => item.isDirectory())
							.filter((item) => item.name.startsWith('v'))
							.sort();

						if (directories.length > 0) {
							result = path.join(result, directories[directories.length - 1].name);
						} else {
							throw new Error(`lookup error: failed to find an MPLABX installation`);
						}
					} else {
						throw new Error(`lookup error: failed to find an MPLABX installation`);
					}
				} catch (e) {
					console.log(`An error occurred. ${e}`);
				}
			}

			this._mplabxLocation = result;
		}

		return this._mplabxLocation;
	}

	/** Manually sets the the location of the MPLABX Installation, for those who don't use
	 * the default location
	*/
	set mplabxFolder(location: string) {
		this._mplabxLocation = location;
		this._mplabxPlatformFolder = undefined;
	}

	private _mplabxPlatformFolder: string | undefined;

	get mplabxPlatformFolder(): string {

		if (!this._mplabxPlatformFolder) {
			let result = this.mplabxFolder;

			if (fs.existsSync(path.join(result, 'mplab_platform'))) {
				result = path.join(result, 'mplab_platform');
			} else if (fs.existsSync(path.join(result, 'mplab_ide'))) {
				result = path.join(result, 'mplab_ide');
			} else {
				throw new Error(`lookup error: failed to find an MPLABX installation`);
			}

			this._mplabxPlatformFolder = result;
		}

		return this._mplabxPlatformFolder;
	}

	/** Gets the absolute path to the Microchip Debugger */
	get mplabxDebuggerPath(): string {

		if (macos || linux) {
			return path.join(this.mplabxPlatformFolder, 'bin', 'mdb.sh');
		} else if (windows) {
			return `"${path.join(this.mplabxPlatformFolder, 'bin', 'mdb.bat')}"`;
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}

	/** Gets the absolute path to the Microchip Maker */
	get mplabxMakePath(): string {

		if (macos || linux) {
			return `"${path.join(this.mplabxPlatformFolder, 'bin', 'make')}"`;
		} else if (windows) {
			return `"${path.join(this.mplabxFolder, 'gnuBins', 'gnuWin32', 'bin', 'make.exe')}"`;
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}

	/** Gets the absolute path to the Microchip IPECMD */
	get mplabxIpecmdPath(): string {

		const ipePath: string = path.join(this.mplabxFolder, 'mplab_ipe');
		if (macos) {
			return `"${path.join(ipePath, 'bin', 'ipecmd.sh')}"`;
		} else if (linux) {
			// TODO: This will probably not work
			return `java -jar "${path.join(ipePath, 'ipecmd.jar')}"`;
		} else if (windows) {
			return `"${path.join(ipePath, 'ipecmd.exe')}"`;
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}

	/** Gets the Microchip Debugger Process */
	private get mdbProcess(): ChildProcess {

		if (this.disposed) {
			throw new Error('Attempted to use MPLAB Assistant after being disposed');
		}

		return this._mdbProcess;
	}

	/** Writes the given command to the Microchip Debugger
	 * @param input The command to send
	 */
	private writeToDebugger(input: string) {
		if (this.mdbProcess.stdin) {
			this.mdbProcess.stdin.write(input + '\r\n');
			this._vscodeMdbOutput?.appendLine(input);
		} else {
			throw new Error('Microchip Debugger missing a standard input');
		}
	}

	/** Reads a single line from the Microchip Debugger */
	private async readLineFromDebugger(): Promise<string> {
		if (this.mdbProcess.stdout) {

			return new Promise((resolve, reject) => {
				this.mdbProcess.stdout?.once('data', resolve);
			});
		}
		else {
			throw new Error('Microchip Debugger is missing a standard output');
		}
	}

	/** Reads the whole response to a command from the Microchip Debugger */
	private async readResultFromDebugger(): Promise<string> {

		let result: string = '';
		do {
			result += await this.readLineFromDebugger();
		} while (!result.endsWith('>'));

		return result;
	}

	/** Sends a command to the Microchip Debugger and returns the whole response
	 * @param input The command to send to the debugger
	 */
	private async queryFromDebugger(input: string): Promise<string> {

		return this._mdbMutex.runExclusive(() => {
			// Read off any data that may be sitting in the buffer.
			if (this.mdbProcess.stdout?.readableLength ?? 0 > 0) {
				this.mdbProcess.stdout?.read();
			}

			this.writeToDebugger(input);

			return this.readResultFromDebugger();
		});
	}

	/** Finds folders end with ".X" and contain a Makefile  
	 * @param token An optional cancellation token
	*/
	public async findMplabxProjectFolders(token?: vscode.CancellationToken): Promise<string[]> {
		return vscode.workspace.findFiles('**/Makefile', "", 20, token)
			.then((uris) => uris.filter((uri) => uri.path.includes(".X")))
			.then((us) => us.map((u) => {
				let path: string = u.fsPath.replace("Makefile", "");
				return path.substring(0, path.length - 1);
			}));
	}

	/** Returns a task that can build an MPLABX Project */
	public getBuildTask(definition: MpMakeTaskDefinition,
		scope?: vscode.TaskScope | vscode.WorkspaceFolder): vscode.Task {
		return new vscode.Task(
			definition,
			scope ?? vscode.TaskScope.Workspace,
			'Build',
			'MPLABX Make',
			new vscode.ShellExecution(this.mplabxMakePath,
				{
					cwd: definition.projectFolder,
					executable: windows ? 'cmd' : undefined,
					shellArgs: windows ? ['/d', '/c'] : undefined
				}),
			'$xc'
		);
	}

	/** Gets a list of all the attached hardware tools that can program */
	public async getAttachedProgramers(): Promise<string[]> {

		return this.queryFromDebugger("hwtool").then((value) => {

			let lines: string[] = value.split('\n');

			// Skip the first line
			lines.shift();

			// Removed the last two elements
			lines.pop();
			lines.pop();

			lines.forEach((v, index) => {
				let cells = v.split('\t');
				v = cells[cells.length - 1];
			});

			return lines;
		});
	}

	public async readConfigFile(projectPath: string): Promise<any> {

		let configPath: string = path.join(projectPath, 'nbproject', 'configurations.xml');

		const { promises: { readFile } } = require("fs");

		return readFile(configPath).then((data) => {
			var parser = new xml2js.Parser();

			return parser.parseStringPromise(data);
		});
	}

	public async readPrivateConfigFile(projectPath: string): Promise<any> {

		let configPath: string = path.join(projectPath, 'nbproject', 'private', 'configurations.xml');

		const { promises: { readFile } } = require("fs");

		return readFile(configPath).then((data) => {
			var parser = new xml2js.Parser();

			return parser.parseStringPromise(data);
		});
	}

	/** A dictionary translating Configuration tool names to MDB tool names */
	private confToMdBNames = {
		"PICkit3PlatformTool": "PICKit3",
		"pk4hybrid": "PICKit4"
	};

	public async programDevice(projectPath: string, configuration = 'default', production = true): Promise<string | undefined> {

		let programMutex = new Mutex();
		let buildResult: number | undefined = -1;

		// Start up the build
		programMutex.runExclusive(() => {
			vscode.tasks.executeTask(this.getBuildTask({
				projectFolder: projectPath,
				type: 'build'
			})).then((execution) => {
				let disposable = vscode.tasks.onDidEndTaskProcess((e) => {
					if (e.execution === execution) {
						disposable.dispose();

						// If the build exited successfully, then we can program
						if (e.exitCode === 0) {
							setTimeout(() => {
								this._vscodeMdbOutput.show(true);
							}, 2000);
						}

						buildResult = e.exitCode;
					}
				});
			});
		});

		return this.readConfigFile(projectPath).then((config) => {
			// Get the active configuration
			const confs: Array<any> = config.configurationDescriptor.confs;
			return confs.find((value) => value.conf[0].$.name === configuration).conf[0];

		}).then((conf) => {
			const device: string = conf.toolsSet[0].targetDevice[0];

			const pathParts: Array<string> = projectPath.split('/');
			const projectName = pathParts[pathParts.length - 1];

			const prodOrDebug: string = (production ? 'production' : 'debug');

			const hexPath: string = path.join(projectPath, 'dist', conf.$.name, prodOrDebug, `${projectName}.${prodOrDebug}.hex`);

			return this.queryFromDebugger(`Device ${device}`).then((deviceResponse: String) => {

				deviceResponse = deviceResponse.replace('>', '').trim();
				if (deviceResponse === '') {
					const pTool = conf.toolsSet[0].platformTool[0];

					if (conf[pTool]) {
						conf[pTool][0].property.forEach((pair) => {
							const key: string = pair.$.key;
							// Keys with a capital value don't work
							if (key[0].toLowerCase() === key[0]) {
								const value: string = pair.$.value;

								// Values with '{' in it, needs resolved... idk how to do
								if (!value.includes('{') && value.length > 0) {
									this.queryFromDebugger(`set ${key} ${value}`);
								}
							}
						});
					}

					return this.queryFromDebugger(`Hwtool ${this.confToMdBNames[pTool]} -p`)
						.then((toolResponse: string) => {
							// TODO: Make sure the attach was successful
							if (toolResponse.includes(`Target device ${device} found.`)) {
								return programMutex.runExclusive(() => {
									if (buildResult === 0) {
										return this.queryFromDebugger(`Program "${hexPath}"`)
											.then((result) => {
												let r: string[] = result.split('\n');
												return r[r.length - 1];
											}).then(() => {
												this.queryFromDebugger('Reset');
												return '';
											});
									} else {
										return 'Build Failed';
									}
								});
							} else {
								return `Error selecting programmer: ${toolResponse}`;
							}
						});
				} else {
					return `Error selecting target device: ${deviceResponse}`;
				}
			});
		});
	}

	/** Disposes the assistant */
	public dispose() {
		this.disposed = true;
		if (this._mdbProcess) {
			this.writeToDebugger('quit');
		}
	}
}

export interface MpMakeTaskDefinition extends vscode.TaskDefinition {
	projectFolder: string;
	configuration?: string;
}

export interface MpProgramTaskDefinition extends MpMakeTaskDefinition {
	hexFile: string;
}
