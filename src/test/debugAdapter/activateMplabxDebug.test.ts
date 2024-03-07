import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as testFile from '../../debugAdapter/activateMplabxDebug';
import { asyncWait, selectFirstQuickItem } from '../testHelpers';
import * as sinon from 'sinon';

suite('Activate Debugger Test Suite', () => {

    test('Mdb Empty Configuration', async function () {

        const provider = new testFile.MdbConfigurationProvider();

        const showInputBox = sinon.stub(vscode.window, 'showInputBox');
        showInputBox.resolves('PIC24FJ128GB406');

        const selectedTool = { label: 'Sim' };
        const showQuickPick = sinon.stub(vscode.window, 'showQuickPick');
        showQuickPick.resolves(selectedTool);

        const showOpenDialog = sinon.stub(vscode.window, 'showOpenDialog');
        showOpenDialog.resolves([vscode.Uri.parse('Test.elf')]);

        const waiter = provider.resolveDebugConfiguration(undefined, {} as vscode.DebugConfiguration, undefined);

        const result = await waiter as testFile.MdbDebugConfiguration;

        assert.strictEqual(result.type, 'mdb');
        assert.strictEqual(result.filePath, '/Test.elf');
        assert.strictEqual(result.toolType, selectedTool);
        assert.strictEqual(result.device, 'PIC24FJ128GB406');
    });

    test('Mplabx Empty Configuration', async function () {

        // Make sure all editors are closed
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        const provider = new testFile.MplabxConfigurationProvider();

        const result = await provider.resolveDebugConfiguration(undefined, {} as vscode.DebugConfiguration, undefined);

        assert.strictEqual(result?.type, 'mdb');
    });

    test('Mplabx Empty Configuration, Open Document', async function () {

        // Make sure at least editors is open
        const mainFile = await vscode.workspace.findFiles('main.c');
        const document = await vscode.workspace.openTextDocument(mainFile[0]);
        await vscode.window.showTextDocument(document);

        const provider = new testFile.MplabxConfigurationProvider();

        const result = await provider.resolveDebugConfiguration(undefined, { debug: true } as testFile.MplabxDebugConfiguration, undefined);

        assert.strictEqual(result?.type, 'mdb');

        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('Mplabx Tool Options', async function () {
        // Make sure all editors are closed
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        await vscode.workspace.getConfiguration('vslabx').update('programerToolAllowList', ['.*']);

        const provider = new testFile.MplabxConfigurationProvider();

        const result = await provider.resolveDebugConfiguration(undefined, {} as vscode.DebugConfiguration, undefined);

        assert.strictEqual(result?.type, 'mdb');

        await vscode.workspace.getConfiguration('vslabx').update('programerToolAllowList', []);
    });
});
