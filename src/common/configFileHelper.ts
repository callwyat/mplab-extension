/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

import path = require("path");
import { readFileSync } from "fs";
import { readFile } from "fs/promises";

/** The information needed to connect to a target device */
interface TargetInterface {

    /** The name of the configuration that information came from */
    configurationName: string;

    /** The name of the device to connect to (e.g. PIC18F46J53) */
    device: string;

    /** The name of the tool to connect to the device with (e.g. PicKIT4) */
    tool: string;

    /** Additional options to send to the tool when connecting to the device */
    toolOptions: {};
}

/** A collection of methods to use when working with MPLABX configuration.xml files */
export class MplabxConfigFile {

    /**
     * Gets the default path to a configuration file from a project folder
     * @param projectPath The absolute path to the project file to use
     * @returns The absolute path to the configuration file for the project
     */
    public static getConfigFilePath(projectPath: string): string {
        return path.join(projectPath, 'nbproject', 'configurations.xml');
    }

    /**
     * Reads a configuration file into an object for inspection 
     * @param projectPath The absolute path to the project file to use
     * @returns an object that represents the configuration
     */
    public static async read(projectPath: string): Promise<any> {

        let configPath: string = MplabxConfigFile.getConfigFilePath(projectPath);

        return readFile(configPath).then((data) => {
            var xml = require('pixl-xml');

            return xml.parse(data);
        });
    }

    /**
     * Reads a configuration file into an object for inspection 
     * @param projectPath The absolute path to the project file to use
     * @returns an object that represents the configuration
     */
    public static readSync(projectPath: string): any {

        let configPath: string = MplabxConfigFile.getConfigFilePath(projectPath);

        var xml = require('pixl-xml');

        return xml.parse(readFileSync(configPath));
    }

    /**
     * Gets the name of the configuration to use based on the provide config name
     * @param project The project object as obtained from the read or readSync methods
     * @param configName The name of the configuration to get project file
     * @returns The configuration name that makes the most sense based on the config name
     */
    public static resolveConfigurationName(project: any, configName?: string): string {
        return this.resolveConfiguration(project, configName).name;
    }

    /**
     * Reads the information for connecting to a target from a configuration file
     * @param project The project object as obtained from the read or readSync methods
     * @param configName The name of the configuration to get project file
     * @returns The configuration to use
     */
    public static resolveConfiguration(project: any, configName?: string): any {
        let confs = project.confs.conf;
        let conf: any;

        // If there is only one configuration, confs is already what we need, otherwise search for a configuration
        if (confs.name) {
            conf = confs;
        } else if (confs.length === 0) {
            throw Error(`Failure to find any configurations in given project`);
        } else if (confs.length === 1) {
            conf = confs[0];
        } else {

            if (!configName) {
                configName = 'default';
            }

            conf = confs.find(c => c.name === configName);

            if (!conf) {
                throw Error(`Failure to find a "${configName}" configuration in given project. Please specify a "configuration".`);
            }
        }

        return conf;
    }

    /**
     * Reads the information for connecting to a target from a configuration file
     * @param project The project object as obtained from the read or readSync methods
     * @param configName The name of the configuration to get the Target Interface from
     * @returns The information needed to connect to a target device
     */
    public static getTargetInterface(project: any, configName?: string): TargetInterface {

        const conf = this.resolveConfiguration(project, configName);

        const tool = conf.toolsSet.platformTool;

        const toolOptions = {};

        // Collect all the tool settings
        if (conf[tool]) {

            conf[tool].property.forEach((pair) => {
                const key: string = pair.key;
                const value: string = pair.value;
                toolOptions[key] = value;
            });
        }

        // Get the tool
        return {
            configurationName: conf.name,
            device: conf.toolsSet.targetDevice,
            tool: tool,
            toolOptions: toolOptions
        };
    }
}