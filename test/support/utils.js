/* --------------------
 * react-lazy-data module
 * Test utils
 * ------------------*/

// Modules

// This is a hack to load dev version of `react-dom/test-utils` when running tests on production builds.
// Otherwise get warnings
// "act(...) is not supported in production builds of React, and might not behave as expected."
// NB Using `require` rather than `import` to stop Babel moving the import code
// to outside of the code which sets and resets NODE_ENV.
// TODO Work out a better way to do this.
const isProd = process.env.NODE_ENV === 'production';
if (isProd) process.env.NODE_ENV = 'test';
// eslint-disable-next-line import/newline-after-import
const actOriginal = require('react-dom/test-utils').act;
if (isProd) process.env.NODE_ENV = 'production';

// Exports

export {default as render} from './render.js';
export {default as hydrate} from './hydrate.js';
export {default as spy} from './spy.js';

export function getFirstCall(mockFn) {
	return mockFn.mock.calls[0];
}

export function getFirstCallArg(mockFn) {
	return getFirstCall(mockFn)[0];
}

export function tryCatch(fn) {
	try {
		fn();
		return undefined;
	} catch (err) {
		return err;
	}
}

export function tick() {
	return new Promise(
		resolve => setTimeout(resolve, 0)
	);
}

/**
 * Created deferred.
 * Returns object with the following properties:
 *   `.promise` - Promise
 *   `.resolve(val)` - Call to resolve promise with `val`
 *   `.reject(err)` - Call to reject promise with `err`
 * `.resolve()` and `.reject()` await the promise's resolution, wait a tick to allow the promise
 * to propogate, and then calls `act()` to fire effects and update DOM.
 * So awaiting the Promise returned by `.resolve()` / `.reject()` will await all the above being done.
 *
 * @returns {Object} - Deferred object
 */
export function defer() {
	const deferred = {};
	deferred.promise = new Promise((resolve, reject) => {
		deferred.resolve = async (val) => {
			resolve(val);
			await deferred.promise;
			await tick();
			act();
		};
		deferred.reject = async (err) => {
			reject(err);
			await deferred.promise.catch(() => {});
			await tick();
			act();
		};
	});

	return deferred;
}

/**
 * ReactDOM/test-utils's `act()` function, wrapped so can be called without a function.
 * @param {Function} [fn] - Act function (optional)
 * @returns {*} - Return value of `act()`
 */
export function act(fn) {
	return actOriginal(fn || noop);
}

function noop() {}
