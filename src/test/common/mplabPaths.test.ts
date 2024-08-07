import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as fs from 'fs';
import path = require('path');
import { MPLABXPaths } from '../../common/mplabPaths';

/** Tests that when a path override will return the overridden path */
async function overridePathTest(configName: string) {

	const mplabPaths = new MPLABXPaths();

	const config = vscode.workspace.getConfiguration('vslabx');
	const testPath = 'TestTESTTest';

	try {
		await config.update(configName, testPath, true);

		assert.strictEqual(mplabPaths[configName], testPath);
	} finally {
		await config.update(configName, await config.inspect(configName)?.defaultValue, true);
	}
}

suite('MPLABX Paths Test Suite', () => {

	suiteTeardown(() => {
		vscode.window.showInformationMessage('All tests done!');
	});

	vscode.window.showInformationMessage('Start all tests.');

	test('make path test', () => {
		const mplabPaths = new MPLABXPaths();

		assert.strictEqual(fs.existsSync(mplabPaths.mplabxMakePath), true);
	});

	test('debugger path test', () => {
		const mplabPaths = new MPLABXPaths();

		assert.strictEqual(fs.existsSync(mplabPaths.mplabxDebuggerPath), true);
	});

	test('makefile generator path test', () => {
		const mplabPaths = new MPLABXPaths();

		assert.strictEqual(fs.existsSync(mplabPaths.mplabxMakefileGeneratorPath), true);
	});

	test('path general override tests', async () => {

		const mplabPaths = new MPLABXPaths();

		const config = vscode.workspace.getConfiguration('vslabx');
		const basePathName = 'mplabxFolderLocation';
		const versionName = 'mplabxVersion';

		const basePath = 'TestPath';
		const versionPath = '0.0.0';

		try {
			await config.update(basePathName, basePath, true);
			await config.update(versionName, versionPath, true);

			assert.strictEqual(mplabPaths.mplabxFolder, path.join(basePath, 'v0.0.0'));
		} finally {
			await config.update(basePathName, await config.inspect(basePathName)?.defaultValue, true);
			await config.update(versionName, await config.inspect(versionName)?.defaultValue, true);
		}
	});

	test('mplabxDebuggerPath override test', async () => {

		await overridePathTest('mplabxDebuggerPath');
	});

	test('mplabxMakePath override test', async () => {

		await overridePathTest('mplabxMakePath');
	});

	test('mplabxMakefileGeneratorPath override test', async () => {

		await overridePathTest('mplabxMakefileGeneratorPath');
	});

	test('mplabxIpecmdPath override test', async () => {

		await overridePathTest('mplabxIpecmdPath');
	});
});
