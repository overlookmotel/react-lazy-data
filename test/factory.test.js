/* --------------------
 * react-lazy-data module
 * Tests for `createResourceFactory()`
 * ------------------*/

// Modules
// eslint-disable-next-line import/no-unresolved, node/no-missing-import
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
