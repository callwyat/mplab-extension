/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
import { windows, linux, macos } from 'platform-detect';
import path = require('path');

/** A helper class for finding all the MPLABX things */
export class MPLABXAssistant {

	private version: string | undefined;

	/**
	 * A helper class for all things MPLABX
	 * @param version Specifies the version to use, or leave undefined to use the latest version
	 */
	constructor(version?: string) {
		this.version = version;
	}

	private _mplabxLocation: string = '';

	/** Finds the absolute path to the latest installed version of MPLABX */
	get mplabxLocation(): string {

		if (this._mplabxLocation === '') {
			var path = require('path');
			var fs = require('fs');

			let result = '' as string;
			if (macos) {
				result = '/Applications/microchip/mplabx';
			} else if (windows) {
				result = 'c:\\Program Files (x86)\\Microchip\\MPLABX';
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

			if (macos) {
				result = path.join(result, 'mplab_platform/bin/mdb.sh');
			} else if (windows) {
				result = path.join(result, 'mplab_ide\\bin\\mdb.bat');
			} else if (linux) {
				result = path.join(result, 'mplab_ide/bin/mdb.sh');
			} else {
				throw new Error(`lookup error: unknown operating system. How did you get here...`);
			}

			this._mplabxLocation = result;
		}

		return this._mplabxLocation;
	}

    /** Manually sets the the location of the MPLABX Installation, for those who don't use
     * the default location
    */
    set mplabxLocation(location: string) {
        this._mplabxLocation = location;
    }

	/** Gets the absolute path to the 'bin' folder of the MPLABX location */
	get mplabxBinPath(): string {
		return path.join(this.mplabxLocation, 'bin');
	}

	/** Gets the absolute path to the Microchip Debugger */
	get mplabxDebuggerPath(): string {

		if (macos || linux) {
			return path.join(this.mplabxBinPath, 'mdb.sh');
		} else if (windows) {
			return path.join(this.mplabxBinPath, 'mdb.bat');
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}

    /** Gets the absolute path to the Microchip Maker */
	get mplabxMakePath(): string {

		if (macos || linux) {
			return path.join(this.mplabxBinPath, 'make');
		} else if (windows) {
			return path.join(this.mplabxBinPath, 'make.exe');
		} else {
			throw new Error(`lookup error: unknown operating system.`);
		}
	}
    
}
