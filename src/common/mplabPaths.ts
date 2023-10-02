/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
import { windows, linux, macos } from 'platform-detect';
import path = require('path');
import fs = require('fs');
import * as vscode from 'vscode';

/** A class to help find paths related to MPLABX */
export class MPLABXPaths {

	private _mplabxLocation: string = '';

	/** Finds the absolute path to a version of MPLABX using the VSCode Settings*/
	get mplabxFolder(): string {

		if (this._mplabxLocation === '') {
			let result = '' as string;

			let config = vscode.workspace.getConfiguration('vslabx').get<string>('mplabxFolderLocation');

			if (config && config !== 'default') {
				result = config;
			}
			else if (macos) {
				result = '/Applications/microchip/mplabx';
			} else if (windows) {
				result = 'C:\\Program Files\\Microchip\\MPLABX';
				if (!fs.existsSync(result)) {
					result = 'C:\\Program Files (x86)\\Microchip\\MPLABX';
				}
			} else if (linux) {
				result = '/opt/microchip/mplabx';
			} else {
				throw new Error(`lookup error: unknown operating system.`);
			}

			let version = vscode.workspace.getConfiguration('vslabx').get<string>('mplabxVersion');

			if (version && version !== "latest") {
				result = path.join(result, `v${version}`);
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
			return path.join(this.mplabxPlatformFolder, 'bin', 'mdb.bat');
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}

	/** Gets the absolute path to the Microchip Maker */
	get mplabxMakePath(): string {

		if (macos || linux) {
			return path.join(this.mplabxPlatformFolder, 'bin', 'make');
		} else if (windows) {
			return path.join(this.mplabxFolder, 'gnuBins', 'gnuWin32', 'bin', 'make.exe');
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}

	/** Gets the path to the script for building all the auto-generated Makefile stuff */
	get mplabxMakefileGeneratorPath(): string {
		if (macos || linux) {
			return path.join(this.mplabxPlatformFolder, 'bin', 'prjMakefilesGenerator.sh');
		} else if (windows) {
			return path.join(this.mplabxPlatformFolder, 'bin', 'prjMakefilesGenerator.bat');
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}

	/** Gets the absolute path to the Microchip IPECMD */
	get mplabxIpecmdPath(): string {

		const ipePath: string = path.join(this.mplabxFolder, 'mplab_ipe');
		if (macos) {
			return path.join(ipePath, 'bin', 'ipecmd.sh');
		} else if (linux) {
			// TODO: This will probably not work
			return `java -jar "${path.join(ipePath, 'ipecmd.jar')}"`;
		} else if (windows) {
			return path.join(ipePath, 'ipecmd.exe');
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}
}
