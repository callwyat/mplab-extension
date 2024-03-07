
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { MplabxConfigFile } from '../../common/configFileHelper';
import path from 'path';

suite('Config File Helpers Test Suite', () => {

    test('Async Read Config File', async function () {

        const configFile = await MplabxConfigFile.read(path.join(__dirname, '../../../src/test/sampleWorkspace/TestProject.X'));

		assert.equal(configFile.projectmakefile, 'Makefile');
	});

});