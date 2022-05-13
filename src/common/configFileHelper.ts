import path = require("path");
import xml2js = require('xml2js');

export class MplabxConfigFile {

    public static async read(projectPath: string): Promise<any> {

        let configPath: string = path.join(projectPath, 'nbproject', 'configurations.xml');

        const { promises: { readFile } } = require("fs");

        return readFile(configPath).then((data) => {
            var parser = new xml2js.Parser();

            return parser.parseStringPromise(data);
        });
    }
}