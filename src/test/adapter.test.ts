/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert = require('assert');
import * as Path from 'path';
import { DebugClient } from '@vscode/debugadapter-testsupport';
import { DebugProtocol } from '@vscode/debugprotocol';
import { Source } from '@vscode/debugadapter';

suite('Node Debug Adapter', () => {

	const DEBUG_ADAPTER = './out/debugAdapter.js';

	const PROJECT_ROOT = Path.join(__dirname, '../../');
	const DATA_ROOT = Path.join(PROJECT_ROOT, 'src/tests/projects/');


	let dc: DebugClient;

	setup(() => {
		dc = new DebugClient('node', DEBUG_ADAPTER, 'mplabx');
		return dc.start();
	});

	teardown(() => dc.stop());

	suite('basic', () => {

		test('unknown request should produce error', done => {
			dc.send('illegal_request').then(() => {
				done(new Error("does not report error on unknown request"));
			}).catch(() => {
				done();
			});
		});
	});

	suite('initialize', () => {

		test('should return supported features', () => {
			return dc.initializeRequest().then(response => {
				response.body = response.body || {};
				assert.equal(response.body.supportsConfigurationDoneRequest, true);
			});
		});

		test('should produce error for invalid \'pathFormat\'', done => {
			dc.initializeRequest({
				adapterID: 'mplabx',
				linesStartAt1: true,
				columnsStartAt1: true,
				pathFormat: 'url'
			}).then(response => {
				done(new Error("does not report error on invalid 'pathFormat' attribute"));
			}).catch(err => {
				// error expected
				done();
			});
		});
	});
	
	suite('launch', function() {
		test('should stop on entry', function() {
			
			this.timeout(30000);
			const PROGRAM = Path.join(DATA_ROOT, 'debug-test.X');
			const ENTRY_LINE = 1;

			return Promise.all([
				dc.configurationSequence(),
				dc.launch({ program: PROGRAM, stopOnEntry: true }),
				dc.assertStoppedLocation('entry', { line: ENTRY_LINE })
			]);
		});
	});

	suite('setBreakpoints', () => {
		
		test('should stop on a breakpoint', () => {
		
			const PROGRAM = Path.join(DATA_ROOT, 'debug-test.X');
			const BREAKPOINT_LINE = 95;

			const args: DebugProtocol.SetBreakpointsArguments = {
				source: new Source('main.c'),
				breakpoints: [{ line: BREAKPOINT_LINE }]
			};

			dc.setBreakpointsRequest(args);

			return dc.hitBreakpoint({ program: PROGRAM }, { path: PROGRAM, line: BREAKPOINT_LINE });
		}).timeout(30000);
	}).timeout(30000);
});