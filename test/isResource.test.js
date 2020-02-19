/* --------------------
 * react-lazy-data module
 * Tests for `isResource()`
 * ------------------*/

// Modules
// eslint-disable-next-line import/no-unresolved, node/no-missing-import
import {isResource, createResourceFactory} from 'react-lazy-data';

// Init
import './support/index.js';

// Tests

describe('isResource', () => {
	it('is a function', () => {
		expect(isResource).toBeFunction();
	});

	it('returns true when passed a resource', () => {
		const factory = createResourceFactory(() => new Promise(() => {}));
		const resource = factory.create();
		expect(isResource(resource)).toBe(true);
	});

	describe('returns false when passed', () => {
		it('null', () => {
			expect(isResource(null)).toBe(false);
		});

		it('undefined', () => {
			expect(isResource(undefined)).toBe(false);
		});

		it('string', () => {
			expect(isResource('abc')).toBe(false);
		});

		it('number', () => {
			expect(isResource(123)).toBe(false);
		});

		it('object', () => {
			expect(isResource({})).toBe(false);
		});

		it('function', () => {
			expect(isResource(() => {})).toBe(false);
		});

		it('ResourceFactory', () => { // eslint-disable-line jest/lowercase-name
			const factory = createResourceFactory(() => new Promise(() => {}));
			expect(isResource(factory)).toBe(false);
		});
	});
});
