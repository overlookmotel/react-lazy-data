/* --------------------
 * react-lazy-data module
 * Tests for `createResourceFactory()`
 *
 * @jest-environment jsdom
 * ------------------*/

// Modules
// eslint-disable-next-line import/no-unresolved, node/no-missing-import
import {createResourceFactory, isResource} from 'react-lazy-data';
import React, {Suspense, useState} from 'react';

// Imports
import {spy, tryCatch, render, defer, tick, act} from './support/utils.js';

// Init
import './support/index.js';

// Tests

// TODO Tests for promise rejection/sync error in fetch function

let factory, fetchFn, req1, req2, setReq, promise1, promise2, resolve1, resolve2,
	resource1, resource2, fetched2, App, Intermediate, Component, container;
beforeEach(() => {
	({promise: promise1, resolve: resolve1} = defer());
	({promise: promise2, resolve: resolve2} = defer());

	promise1.abort = spy();

	fetched2 = spy();
	fetchFn = spy(({num}) => {
		if (num === 1) return promise1;
		fetched2();
		return promise2;
	});

	factory = createResourceFactory(fetchFn);

	req1 = {num: 1};
	req2 = {num: 2};
	setReq = null;

	Component = spy(({resource}) => {
		const res = resource.read();
		// Return `.a` property of result if present, or null
		return !res ? null : res.a || null;
	});

	Intermediate = spy(({req}) => {
		const resource = factory.use(req);
		if (req.num === 1) {
			resource1 = resource;
		} else {
			resource2 = resource;
		}

		return (
			<Suspense fallback="Loading">
				<Component resource={resource} />
			</Suspense>
		);
	});

	App = spy(() => {
		const [req, _setReq] = useState(req1);
		setReq = _setReq;

		if (!req) return 'Nothing';
		return <Intermediate req={req} />;
	});

	container = render(<App />);
});

describe('factory.use', () => {
	// Flush all pending effects before test ends so any errors or unhandled rejections make test fail
	afterEach(() => {
		act();
	});

	it('is a function', () => {
		expect(factory.use).toBeFunction();
	});

	it('returns a resource', () => {
		expect(resource1).toBeObject();
		expect(isResource(resource1)).toBeTrue();
	});

	it('does not call fetch function synchronously', () => {
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('calls fetch function asynchronously with request', () => {
		act();
		expect(fetchFn).toHaveBeenCalledTimes(1);
		expect(fetchFn).toHaveBeenCalledWith(req1);
	});

	it('does not call fetch function again when fetch promise resolves', async () => {
		await resolve1();
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	describe('resource.read', () => {
		it('is a function', () => {
			expect(resource1.read).toBeFunction();
		});

		describe('before fetch function called', () => {
			beforeEach(() => {
				// Sanity check
				// eslint-disable-next-line jest/no-standalone-expect
				expect(fetchFn).not.toHaveBeenCalled();
			});

			it('throws promise', () => {
				const thrown = tryCatch(() => resource1.read());
				expect(fetchFn).not.toHaveBeenCalled();
				expect(thrown).toBeInstanceOf(Promise);
			});

			it('root rendered once only', () => {
				act();
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component rendered once only', () => {
				act();
				expect(Component).toHaveBeenCalledTimes(1);
			});

			it('renders Suspense fallback', () => {
				expect(container).toContainHTML('Loading');
				act();
				expect(container).toContainHTML('Loading');
			});
		});

		describe('before fetch promise resolves', () => {
			function prep() {
				act();

				// Sanity check
				expect(fetchFn).toHaveBeenCalledTimes(1);
			}

			it('throws promise', () => {
				prep();
				const thrown = tryCatch(() => resource1.read());
				expect(thrown).toBeInstanceOf(Promise);
			});

			it('throws same promise as before fetch function called', () => {
				const thrownBefore = tryCatch(() => resource1.read());
				expect(fetchFn).not.toHaveBeenCalled();

				prep();
				const thrownAfter = tryCatch(() => resource1.read());

				expect(thrownAfter).toBe(thrownBefore);
			});

			it('throws different promise from promise returned by fetch function', () => {
				prep();
				const thrown = tryCatch(() => resource1.read());
				expect(thrown).not.toBe(promise1);
			});

			it('root not re-rendered', () => {
				prep();
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component not re-rendered', () => {
				prep();
				expect(Component).toHaveBeenCalledTimes(1);
			});

			it('renders Suspense fallback', () => {
				prep();
				expect(container).toContainHTML('Loading');
			});
		});

		describe('after fetch promise resolves', () => {
			let ret;
			beforeEach(async () => {
				ret = {a: 'abc'};
				await resolve1(ret);
			});

			it('returns fetch promise resolution value', () => {
				const readRet = resource1.read();
				expect(readRet).toBe(ret);
			});

			it('root not re-rendered', () => {
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component re-rendered once only', () => {
				expect(Component).toHaveBeenCalledTimes(2);
			});

			it('renders component', () => {
				expect(container).toContainHTML('abc');
			});
		});
	});

	describe('resource.dispose', () => {
		// TODO Tests for `.dispose()` called a 2nd time

		describe('called before fetch function called', () => {
			it('prevents fetch function being called', async () => {
				resource1.dispose();
				await tick();
				act();

				expect(fetchFn).not.toHaveBeenCalled();
			});

			it('leaves promise thrown by `.read()` forever pending', async () => {
				const thrown = tryCatch(() => resource1.read());
				const thenSpy = spy();
				thrown.then(thenSpy, thenSpy);

				resource1.dispose();
				await resolve1();

				expect(thenSpy).not.toHaveBeenCalled();
			});
		});

		describe('called before fetch promise resolves', () => {
			beforeEach(() => {
				act();

				// Sanity check
				// eslint-disable-next-line jest/no-standalone-expect
				expect(fetchFn).toHaveBeenCalledTimes(1);
			});

			it('calls `promise.abort()`', () => {
				expect(promise1.abort).not.toHaveBeenCalled();
				resource1.dispose();
				expect(promise1.abort).toHaveBeenCalledTimes(1);
			});

			it('leaves promise thrown by `.read()` forever pending', async () => {
				const thrown = tryCatch(() => resource1.read());
				const thenSpy = spy();
				thrown.then(thenSpy, thenSpy);

				resource1.dispose();
				await resolve1();

				expect(thenSpy).not.toHaveBeenCalled();
			});

			it('root not re-rendered', async () => {
				expect(App).toHaveBeenCalledTimes(1);
				resource1.dispose();
				await resolve1();
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component not re-rendered', async () => {
				expect(Component).toHaveBeenCalledTimes(1);
				resource1.dispose();
				await resolve1();
				expect(Component).toHaveBeenCalledTimes(1);
			});

			it('leaves Suspense fallback rendered', async () => {
				resource1.dispose();
				await resolve1();
				expect(container).toContainHTML('Loading');
			});
		});

		describe('called after fetch promise resolves', () => {
			beforeEach(async () => {
				await resolve1({a: 'abc'});
			});

			async function dispose() {
				resource1.dispose();
				await tick();
				act();
			}

			it('does not call `promise.abort()`', async () => {
				await dispose();
				expect(promise1.abort).not.toHaveBeenCalled();
			});

			it('root not re-rendered', async () => {
				expect(App).toHaveBeenCalledTimes(1);
				await dispose();
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component not re-rendered', async () => {
				expect(Component).toHaveBeenCalledTimes(2);
				await dispose();
				expect(Component).toHaveBeenCalledTimes(2);
			});

			it('leaves content rendered', async () => {
				await dispose();
				expect(container).toContainHTML('abc');
			});
		});
	});
});

describe('auto-disposal', () => {
	describe('when request changes', () => {
		describe('before fetch function called', () => {
			beforeEach(() => {
				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).not.toHaveBeenCalled();
				expect(promise1.abort).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				act(() => setReq(req2));

				// Sanity checks
				// TODO Move these into a test?
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(2);
				expect(Intermediate).toHaveBeenCalledTimes(2);
				expect(Component).toHaveBeenCalledTimes(2);
				/* eslint-enable jest/no-standalone-expect */
			});

			it('`.use()` returns a new resource', () => {
				expect(resource1).toBeObject();
				expect(resource2).toBeObject();
				expect(resource2).not.toBe(resource1);
			});

			it('aborts promise', () => {
				expect(promise1.abort).toHaveBeenCalledTimes(1);
			});

			it('leaves promise thrown by `.read()` on 1st resource forever pending', async () => {
				const componentResult1 = Component.mock.results[0];
				expect(componentResult1.type).toBe('throw');
				const readPromise1 = componentResult1.value;
				expect(readPromise1).toBeInstanceOf(Promise);

				const thenSpy = spy();
				readPromise1.then(thenSpy, thenSpy);
				await resolve1();
				expect(thenSpy).not.toHaveBeenCalled();
			});

			it('calls fetch function with 2nd request', () => {
				expect(fetchFn).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenNthCalledWith(1, req1);
				expect(fetchFn).toHaveBeenNthCalledWith(2, req2);
			});

			it('aborts promise before calling fetch function with 2nd request', () => {
				expect(promise1.abort).toHaveBeenCalledTimes(1);
				expect(fetched2).toHaveBeenCalledTimes(1);
				expect(promise1.abort).toHaveBeenCalledBefore(fetched2);
			});

			it('leaves Suspense fallback rendered', () => {
				expect(container).toContainHTML('Loading');
			});

			it('renders content once 2nd promise resolves', async () => {
				await resolve2({a: 'def'});
				expect(container).toContainHTML('def');
			});
		});

		describe('before fetch promise resolves', () => {
			beforeEach(() => {
				act();

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req1);
				expect(promise1.abort).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				act(() => setReq(req2));
			});

			it('`.use()` returns a new resource', () => {
				expect(resource1).toBeObject();
				expect(resource2).toBeObject();
				expect(resource2).not.toBe(resource1);
			});

			it('aborts promise', () => {
				expect(promise1.abort).toHaveBeenCalledTimes(1);
			});

			it('leaves promise thrown by `.read()` on 1st resource forever pending', async () => {
				const componentResult1 = Component.mock.results[0];
				expect(componentResult1.type).toBe('throw');
				const readPromise1 = componentResult1.value;
				expect(readPromise1).toBeInstanceOf(Promise);

				const thenSpy = spy();
				readPromise1.then(thenSpy, thenSpy);
				await resolve1();
				expect(thenSpy).not.toHaveBeenCalled();
			});

			it('calls fetch function with 2nd request', () => {
				expect(fetchFn).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenLastCalledWith(req2);
			});

			it('aborts promise before calling fetch function with 2nd request', () => {
				expect(promise1.abort).toHaveBeenCalledTimes(1);
				expect(fetched2).toHaveBeenCalledTimes(1);
				expect(promise1.abort).toHaveBeenCalledBefore(fetched2);
			});

			it('leaves Suspense fallback rendered', () => {
				expect(container).toContainHTML('Loading');
			});

			it('renders content once 2nd promise resolves', async () => {
				await resolve2({a: 'def'});
				expect(container).toContainHTML('def');
			});
		});

		describe('after fetch promise resolves', () => {
			beforeEach(async () => {
				await resolve1({a: 'abc'});

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req1);
				expect(promise1.abort).not.toHaveBeenCalled();
				expect(container).toContainHTML('abc');
				/* eslint-enable jest/no-standalone-expect */

				act(() => setReq(req2));
			});

			it('`.use()` returns a new resource', () => {
				expect(resource1).toBeObject();
				expect(resource2).toBeObject();
				expect(resource2).not.toBe(resource1);
			});

			it('does not abort promise', () => {
				expect(promise1.abort).not.toHaveBeenCalled();
			});

			it('calls fetch function with 2nd request', () => {
				expect(fetchFn).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenLastCalledWith(req2);
			});

			it('renders Suspense fallback', () => {
				expect(container).toContainHTML('Loading');
			});

			it('renders content once 2nd promise resolves', async () => {
				await resolve2({a: 'def'});
				expect(container).toContainHTML('def');
			});
		});
	});

	describe('when component calling `.use()` is unmounted', () => {
		describe('before fetch function called', () => {
			beforeEach(() => {
				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).not.toHaveBeenCalled();
				expect(promise1.abort).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				act(() => setReq(null));

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(2);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req1);
				expect(container).toContainHTML('Nothing');
				/* eslint-enable jest/no-standalone-expect */
			});

			it('aborts promise', () => {
				expect(promise1.abort).toHaveBeenCalledTimes(1);
			});

			it('leaves promise thrown by `.read()` forever pending', async () => {
				const componentResult1 = Component.mock.results[0];
				expect(componentResult1.type).toBe('throw');
				const readPromise1 = componentResult1.value;
				expect(readPromise1).toBeInstanceOf(Promise);

				const thenSpy = spy();
				readPromise1.then(thenSpy, thenSpy);
				await resolve1();
				expect(thenSpy).not.toHaveBeenCalled();
			});
		});

		describe('before fetch promise resolves', () => {
			beforeEach(() => {
				act();

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req1);
				expect(promise1.abort).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				act(() => setReq(null));

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(2);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(container).toContainHTML('Nothing');
				/* eslint-enable jest/no-standalone-expect */
			});

			it('aborts promise', () => {
				expect(promise1.abort).toHaveBeenCalledTimes(1);
			});

			it('leaves promise thrown by `.read()` forever pending', async () => {
				const componentResult1 = Component.mock.results[0];
				expect(componentResult1.type).toBe('throw');
				const readPromise1 = componentResult1.value;
				expect(readPromise1).toBeInstanceOf(Promise);

				const thenSpy = spy();
				readPromise1.then(thenSpy, thenSpy);
				await resolve1();
				expect(thenSpy).not.toHaveBeenCalled();
			});
		});

		describe('after fetch promise resolves', () => {
			beforeEach(async () => {
				await resolve1({a: 'abc'});

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req1);
				expect(promise1.abort).not.toHaveBeenCalled();
				expect(container).toContainHTML('abc');
				/* eslint-enable jest/no-standalone-expect */

				act(() => setReq(null));

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(App).toHaveBeenCalledTimes(2);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(container).toContainHTML('Nothing');
				/* eslint-enable jest/no-standalone-expect */
			});

			it('does not abort promise', () => {
				expect(promise1.abort).not.toHaveBeenCalled();
			});
		});
	});
});
