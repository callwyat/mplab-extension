import path = require("path");
import { readFileSync } from "fs";
import { readFile } from "fs/promises";

export class MplabxConfigFile {

    public static async read(projectPath: string): Promise<any> {

        let configPath: string = path.join(projectPath, 'nbproject', 'configurations.xml');

        return readFile(configPath).then((data) => {
            var xml = require('pixl-xml');

            return xml.parse(data);
        });
    }

    public static readSync(projectPath: string): any {

        let configPath: string = path.join(projectPath, 'nbproject', 'configurations.xml');

        var xml = require('pixl-xml');

        return xml.parse(readFileSync(configPath));
    }
}