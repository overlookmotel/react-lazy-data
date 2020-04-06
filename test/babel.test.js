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
					// Short hash of 'code:SK3O9hYzuLh2NOS13TRS7u9P90Ckls/zL/dwa6IrAFA=:0' = 'MTaGGAO1'
					expect(res).toBe('const Fact = createResourceFactory(id => {}, {id: "MTaGGAO1"});');
				});

				itTransforms('based on relative path', async (transform) => {
					const res = await transform(
						'const Fact = createResourceFactory(id => {});',
						{filename: pathJoin(__dirname, 'foo.js')}
					);
					// Short hash of 'path:test/foo.js:0' = 'DxNA_4Ob'
					expect(res).toBe('const Fact = createResourceFactory(id => {}, {id: "DxNA_4Ob"});');
				});
			});

			describe('with two calls, adds different `id` for each', () => {
				itTransforms('based on hash of code', async (transform) => {
					const res = await transform(
						'const Fact = createResourceFactory(id => {});const Fact2 = createResourceFactory(id => {});'
					);
					// SHA256 hash of above code = 'xQX4zlbdzWECUvvI7hSYZDtY4ZN94vWPx5rODgCpUBk='
					// Short hash of 'code:xQX4zlbdzWECUvvI7hSYZDtY4ZN94vWPx5rODgCpUBk=:0' = 'UeQIIMzc'
					// Short hash of 'code:xQX4zlbdzWECUvvI7hSYZDtY4ZN94vWPx5rODgCpUBk=:1' = 'eK2eV3zx'
					expect(res).toBe('const Fact = createResourceFactory(id => {}, {id: "UeQIIMzc"});const Fact2 = createResourceFactory(id => {}, {id: "eK2eV3zx"});');
				});

				itTransforms('based on relative path', async (transform) => {
					const res = await transform(
						'const Fact = createResourceFactory(id => {});const Fact2 = createResourceFactory(id => {});',
						{filename: pathJoin(__dirname, 'foo.js')}
					);
					// Short hash of 'path:test/foo.js:0' = 'DxNA_4Ob'
					// Short hash of 'path:test/foo.js:1' = 'ae9AgbXa'
					expect(res).toBe('const Fact = createResourceFactory(id => {}, {id: "DxNA_4Ob"});const Fact2 = createResourceFactory(id => {}, {id: "ae9AgbXa"});');
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
