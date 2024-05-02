import path = require("path");
import { readFileSync } from "fs";
import { readFile } from "fs/promises";

export class MplabxConfigFile {

    public static getConfigFilePath(projectPath: string): string {
        return path.join(projectPath, 'nbproject', 'configurations.xml');
    }

    public static async read(projectPath: string): Promise<any> {

        let configPath: string = MplabxConfigFile.getConfigFilePath(projectPath);

        return readFile(configPath).then((data) => {
            var xml = require('pixl-xml');

            return xml.parse(data);
        });
    }

    public static readSync(projectPath: string): any {

        let configPath: string = MplabxConfigFile.getConfigFilePath(projectPath);

        var xml = require('pixl-xml');

        return xml.parse(readFileSync(configPath));
    }
}