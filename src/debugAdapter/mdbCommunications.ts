/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
import { ChildProcess, spawn } from 'child_process';
import { Mutex } from 'async-mutex';
import * as vscode from 'vscode';

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

	start(program: string, configuration: string | undefined, arg2: boolean) {
        throw new Error('Method not implemented.');
    }

	/** Disposes the assistant */
	public dispose() {
		this.disposed = true;
		if (this._mdbProcess) {
			this.write('quit');
		}
	}
}
