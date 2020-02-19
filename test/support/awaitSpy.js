/* --------------------
 * react-lazy-data module
 * `awaitSpy()`
 * ------------------*/

// Exports

/**
 * Awaitable spy/mock.
 * Returns a `jest.fn()` spy/mock with additional methods.
 * `spy.calledTimes(n)` return a promise which resolves when the spy has been called `n` times.
 * `spy.calledOnce()` returns a promise which resolves when the spy is called.
 * `spy.calledTwice()` returns a promise which resolves when the spy is called twice.
 *
 * @param {Function} [fn] - Function to wrap (optional)
 * @returns {Function} - Wrapped function
 */
export default function awaitSpy(fn) {
	const callbacks = [];

	const spy = jest.fn(function(...args) {
		const res = fn ? fn.call(this, ...args) : undefined; // eslint-disable-line no-invalid-this

		for (const callback of callbacks) {
			callback();
		}

		return res;
	});

	const {calls} = spy.mock;

	function calledTimes(num) {
		if (calls.length >= num) return Promise.resolve();

		let resolved = false;
		return new Promise((resolve) => {
			callbacks.push(() => {
				if (resolved) return;
				if (calls.length < num) return;

				resolved = true;
				resolve();
			});
		});
	}

	spy.calledTimes = calledTimes;
	spy.calledOnce = () => calledTimes(1);
	spy.calledTwice = () => calledTimes(2);

	return spy;
}
