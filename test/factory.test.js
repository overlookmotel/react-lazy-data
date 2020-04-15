/* --------------------
 * react-lazy-data module
 * Tests for `createResourceFactory()`
 * ------------------*/

// Modules
import {createResourceFactory} from 'react-lazy-data';

// Init
import './support/index.js';

// Tests

describe('createResourceFactory', () => {
	it('is a function', () => {
		expect(createResourceFactory).toBeFunction();
	});

	it('returns an object', () => {
		const factory = createResourceFactory(() => {});
		expect(factory).toBeObject();
	});
});
