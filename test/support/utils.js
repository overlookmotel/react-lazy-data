/* --------------------
 * react-lazy-data module
 * Test utils
 * ------------------*/

// Exports

export {default as render} from './render.js';
export const spy = jest.fn;
export {default as awaitSpy} from './awaitSpy.js';

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
 *   `.isResolved()` - Returns `true` if `resolve()` or `reject()` has been called
 *
 * @returns {Object} - Deferred object
 */
export function defer() {
	let resolved = false;

	const deferred = {};
	deferred.promise = new Promise((resolve, reject) => {
		deferred.resolve = (val) => {
			resolved = true;
			resolve(val);
		};
		deferred.reject = (err) => {
			resolved = true;
			reject(err);
		};
	});

	deferred.isResolved = () => resolved;

	return deferred;
}
