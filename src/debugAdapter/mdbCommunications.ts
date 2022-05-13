/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
import { ChildProcess, spawn } from 'child_process';
import { Mutex } from 'async-mutex';
import * as vscode from 'vscode';
import { MplabxConfigFile } from '../common/configFileHelper';
import path = require('path');
import fs = require('fs');

export interface IConnectResult {
	success: boolean,
	message: string,
}

export interface IDebuggerStartResult {
	success: boolean,
	message: string,
}
export interface ISetBreakpointResponse {
	id: number;
	line: number;
	verified: boolean;
}

export interface IGetBreakpointResponse {
	id: number;
	enabled: boolean;
	address: number;
	file: string;
	line: number;
}

export interface IGetStackResponse {
	index: number;
	name: string;
	file: string;
	line: number;
}

export enum BreakOnType {
	r,
	w,
	rw,
}

export interface ISetWatchResponse {
	id: number;
	verified: boolean;
	message: string;
}

export interface IGetLocalsResponse {
	name: string;

}

/** A helper class for finding all the MPLABX things */
export class MDBCommunications {

	private disposed: boolean = false;
	private _mdbProcess: ChildProcess;
	private _vscodeMdbOutput: vscode.OutputChannel;
	private _mdbMutex: Mutex = new Mutex();

	/**
	 * A helper class for all things MPLABX
	 * @param mdbPath Specifies the path to the mdb debugger to use
	 */
	constructor(mdbPath: string) {
		{
			this._vscodeMdbOutput = vscode.window.createOutputChannel('MPLABX Debugger');

			this._mdbProcess = spawn(mdbPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
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
			this._mdbMutex.runExclusive(() => this.readResult());
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
	public write(input: string) {
		if (this.mdbProcess.stdin) {
			this.mdbProcess.stdin.write(input + '\r\n');
			this._vscodeMdbOutput?.appendLine(input);
		} else {
			throw new Error('Microchip Debugger missing a standard input');
		}
	}

	/** Reads a single line from the Microchip Debugger */
	public async readLine(): Promise<string> {
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
	public async readResult(): Promise<string> {

		let result: string = '';
		do {
			result += await this.readLine();
		} while (!result.endsWith('>'));

		return result;
	}

	/** Sends a command to the Microchip Debugger and returns the whole response
	 * @param input The command to send to the debugger
	 */
	public async query(input: string): Promise<string> {

		return this._mdbMutex.runExclusive(() => {
			// Read off any data that may be sitting in the buffer.
			if (this.mdbProcess.stdout?.readableLength ?? 0 > 0) {
				this.mdbProcess.stdout?.read();
			}

			this.write(input);

			return this.readResult();
		});
	}

	/** Gets a list of all the attached hardware tools that can program */
	public async getAttachedProgramers(): Promise<string[]> {

		return this.query("hwtool").then((value) => {

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

	/** A dictionary translating Configuration tool names to MDB tool names */
	private confToMdBNames = {
		"PICkit3PlatformTool": "PICKit3",
		"pk4hybrid": "PICKit4"
	};

	async connect(conf, programMode: boolean) {

		// Set the target device
		const device: string = conf.toolsSet[0].targetDevice[0];
		this.write(`Device ${device}`);

		// Get the tool
		const tool = conf.toolsSet[0].platformTool[0];

		// Apply all the tool settings
		if (conf[tool]) {
			conf[tool][0].property.forEach((pair) => {
				const key: string = pair.$.key;
				// Keys with a capital value don't work
				if (key[0].toLowerCase() === key[0]) {
					const value: string = pair.$.value;

					// Values with '{' in it, needs resolved... idk how to do
					if (!value.includes('{') && value.length > 0) {
						this.query(`set ${key} ${value}`);
					}
				}
			});
		}

		// Connect to the tools
		let message: string = await this.query(`Hwtool ${this.confToMdBNames[tool]}${programMode ? ' -p' : ''}`);

		if (!message.match(/Target device (.+) found\./)) {
			throw new Error(`Failed to connect to target device ${message}`);
		}
	}

	public async startDebugger(program: string, configuration='default', stopOnEntry: boolean) {

		let project = await MplabxConfigFile.read(program);

		let confs = project.configurationDescriptor.confs;

		let conf = confs.find(c => c.conf[0].$.name === configuration);

		if (conf){
			conf = conf.conf[0];
		} else {
			throw Error(`Failure to find a "${configuration}" configuration in ${project}`);
		}

		return this.connect(conf, false).then(async () => {
			// Program the chip

			// Find the elf
			let elfFolder = path.join(program, 'dist', configuration ? configuration : 'default', 'production');

			if (fs.existsSync(elfFolder)) {
				let elfFiles = fs.readdirSync(elfFolder, { withFileTypes: true })
					.filter(item => item.isFile())
					.filter(item => path.extname(item.name) === '.elf');

				if (elfFiles.length > 0) {
					let elfFile = elfFiles[0].name;

					const programResult = await this.query(`Program "${path.join(elfFolder, elfFile)}"`);
					if (!programResult.match(/Program succeeded\./)) {
						throw new Error('Failure to write program to device');
					}
				} else {
					throw new Error('Failure to find an "elf" file to write to device');
				}
			} else {
				throw new Error(`Failure to find the output folder: ${elfFolder}`);
			}
		});
	}

	public clearBreakpoints() {
		this.write('delete');
	}

	public clearBreakpoint(id: number) {
		this.write(`delete ${id}`);
	}

	public async setBreakpoint(file: string, line: bigint): Promise<ISetBreakpointResponse> {

		return this.query(`break ${file}:${line}`).then(response => {
			let r = response.match(/Breakpoint (\\d+) at file (.+), line (\\d+)\\./s);

			return r?.groups ? { id: parseInt(r.groups[0]), line: parseInt(r.groups[2]), verified: true } :
				{ id: -1, line: -1, verified: false };
		});
	}

	public async getBreakpoints(): Promise<Array<IGetBreakpointResponse> | void> {

		return this.query('info break').then(response => {
			let re = [...response.matchAll(/(\d+)\s*(y|n)\s*(0x[\dA-F]+)\s*at (.*):(\d+)/g)];

			return re.forEach((m, i) => {
				if (m.groups) {
					let g = m.groups;
					return {
						id: parseInt(g[0]),
						enabled: g[1] === 'y',
						address: parseInt(g[2]),
						file: g[3],
						line: parseInt(g[4])
					};
				}
			});
		});
	}

	public async getStack(): Promise<Array<IGetStackResponse> | void> {

		return this.query('backtrace').then(response => {
			let re = [...response.matchAll(/#(\d+)\s+(\w+)\s+\(.*\)\s+at\s(.+):(\d+)/g)];

			return re.forEach((m, i) => {
				if (m.groups) {
					let g = m.groups;
					return {
						index: parseInt(g[0]),
						name: g[1],
						file: g[2],
						line: parseInt(g[3])
					};
				}
			});
		});
	}

	public run(): void {
		this.write('Run');
	}

	public continue(): void {
		this.write('Continue');
	}

	public step(machineInstruction: boolean = false): void {
		this.write(machineInstruction ? 'Stepi' : 'Step');
	}

	public next(): void {
		this.write('Next');
	}

	public halt(): void {
		this.write('Halt');
	}

	public async watch(address: string, breakOnType: BreakOnType, value?: number, passCount?: number): Promise<ISetWatchResponse> {

		var command: string = `Watch ${address} ${breakOnType}`;

		if (typeof value !== 'undefined') {
			command += `:${value}`;
		}

		if (typeof passCount !== 'undefined') {
			command += ` ${passCount}`;
		}

		return this.query(command).then(response => {
			let re = response.match(/Watchpoint (\d+)\./);

			if (re) {
				return {
					verified: true,
					id: re.groups ? parseInt(re.groups[0]) : -1,
					message: response,
				};
			} else {
				return {
					verified: false,
					id: -1,
					message: response,
				};
			}
		});
	}

	/** Disposes the assistant */
	public dispose() {
		this.disposed = true;
		if (this._mdbProcess) {
			this.write('quit');
		}
	}
}
