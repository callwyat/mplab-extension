/*---------------------------------------------------------
 * Copyright (C) Y@ Technologies. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Takes a path and attempts to resolve any substitutions that may exist
 * @param path The 'path' that needs to be resolved
 * @param folder The workspace folder to use
 * @returns path, with less substitutions
 */
export function resolvePath(path: string, folder: vscode.WorkspaceFolder | undefined): string {

    const workspaceMatch = /\$\{workspaceFolder\}/;

    if (!path.match(workspaceMatch)) {
        return path;
    }

    let workspaceFolder: string | undefined;

    if (folder) {
        workspaceFolder = folder.uri.fsPath;
    } else if (vscode.window.activeTextEditor?.document.uri) {
        workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)?.uri.fsPath;
    } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    if (!workspaceFolder) {
        throw new Error('Failed to resolve "${workspaceFolder}" in time to find an MPLABX project folder');
    }

    return path.replace(workspaceMatch, workspaceFolder);
}