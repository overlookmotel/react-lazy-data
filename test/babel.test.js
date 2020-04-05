/* --------------------
 * react-lazy-data module
 * Tests for Babel plugin
 *
 * @jest-environment node
 * ------------------*/

/* eslint-disable jest/no-standalone-expect */

// Modules
import {join as pathJoin} from 'path';
import {create as createPluginTester} from 'babel-test';
// eslint-disable-next-line import/no-unresolved, node/no-missing-import
import babelPlugin from 'react-lazy-data/babel';

// Init
import './support/index.js';

// Create `itTransforms()` test function
const babelTest = createPluginTester({plugins: [babelPlugin]}).test;
function itTransforms(name, fn) {
	return babelTest(name, ({transform}) => {
		async function transformShim(codeIn, options) {
			const {code} = await transform(codeIn, options);
			return code.replace(/\s*\n\s*\s?/g, '');
		}
		return fn(transformShim);
	});
}

// Tests

describe('Babel plugin', () => { // eslint-disable-line jest/lowercase-name
	it('is a function', () => {
		expect(babelPlugin).toBeFunction();
	});

	describe('transforms `createResourceFactory()` calls', () => {
		describe('adds `id` option', () => {
			describe('with one call', () => {
				itTransforms('based on hash of code', async (transform) => {
					const res = await transform('const Fact = createResourceFactory(id => {});');
					// SHA256 hash of above code = 'SK3O9hYzuLh2NOS13TRS7u9P90Ckls/zL/dwa6IrAFA='
					// Short hash of 'code:SK3O9hYzuLh2NOS13TRS7u9P90Ckls/zL/dwa6IrAFA=' = 'Fd6O9CY0'
					expect(res).toBe('const Fact = createResourceFactory(id => {}, {id: "Fd6O9CY0"});');
				});

				itTransforms('based on relative path', async (transform) => {
					const res = await transform(
						'const Fact = createResourceFactory(id => {});',
						{filename: pathJoin(__dirname, 'foo.js')}
					);
					// Short hash of 'path:test/foo.js' = 'Ylt3rpyz'
					expect(res).toBe('const Fact = createResourceFactory(id => {}, {id: "Ylt3rpyz"});');
				});
			});

			describe('with two calls, adds different `id` for each', () => {
				itTransforms('based on hash of code', async (transform) => {
					const res = await transform(
						'const Fact = createResourceFactory(id => {});const Fact2 = createResourceFactory(id => {});'
					);
					// SHA256 hash of above code = 'xQX4zlbdzWECUvvI7hSYZDtY4ZN94vWPx5rODgCpUBk='
					// Short hash of 'code:xQX4zlbdzWECUvvI7hSYZDtY4ZN94vWPx5rODgCpUBk=' = 'GMd$kTdi'
					// Short hash of 'code:xQX4zlbdzWECUvvI7hSYZDtY4ZN94vWPx5rODgCpUBk=\n1' = 'ep3G6bxA'
					expect(res).toBe('const Fact = createResourceFactory(id => {}, {id: "GMd$kTdi"});const Fact2 = createResourceFactory(id => {}, {id: "ep3G6bxA"});');
				});

				itTransforms('based on relative path', async (transform) => {
					const res = await transform(
						'const Fact = createResourceFactory(id => {});const Fact2 = createResourceFactory(id => {});',
						{filename: pathJoin(__dirname, 'foo.js')}
					);
					// Short hash of 'path:test/foo.js' = 'Ylt3rpyz'
					// Short hash of 'path:test/foo.js\n1' = 'eRX5rJXm'
					expect(res).toBe('const Fact = createResourceFactory(id => {}, {id: "Ylt3rpyz"});const Fact2 = createResourceFactory(id => {}, {id: "eRX5rJXm"});');
				});
			});
		});

		describe('does not add `id` option when `noSsr` option set', () => {
			describe('with one call', () => {
				itTransforms('based on hash of code', async (transform) => {
					const code = 'const Fact = createResourceFactory(id => {}, {noSsr: true});';
					const res = await transform(code);
					expect(res).toBe(code);
				});

				itTransforms('based on relative path', async (transform) => {
					const code = 'const Fact = createResourceFactory(id => {}, {noSsr: true});';
					const res = await transform(code, {filename: pathJoin(__dirname, 'foo.js')});
					expect(res).toBe(code);
				});
			});

			describe('with two calls', () => {
				itTransforms('based on hash of code', async (transform) => {
					const code = 'const Fact = createResourceFactory(id => {}, {noSsr: true});const Fact2 = createResourceFactory(id => {}, {noSsr: true});';
					const res = await transform(code);
					expect(res).toBe(code);
				});

				itTransforms('based on relative path', async (transform) => {
					const code = 'const Fact = createResourceFactory(id => {}, {noSsr: true});const Fact2 = createResourceFactory(id => {}, {noSsr: true});';
					const res = await transform(code, {filename: pathJoin(__dirname, 'foo.js')});
					expect(res).toBe(code);
				});
			});
		});
	});
});

/*
pluginTester({
	plugin: babelPlugin,
	pluginName: 'react-lazy-data Babel plugin',
	title: 'Babel plugin transforms',
	formatResult: r => r.replace(/\s*\n\s*\s?/g, ''),
	tests: [
		{
			title: 'unchanged code',
			code: 'const Fact = createResourceFactory(id => {});',
			output: 'const Fact = createResourceFactory(id => {}, {id: "Fd6O9CY0"});'
		}
	]
});
*/
