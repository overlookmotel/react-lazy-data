/* --------------------
 * react-lazy-data module
 * Tests for `createResourceFactory()`
 *
 * @jest-environment jsdom
 * ------------------*/

// Modules
import React, {Suspense} from 'react';
import {createResourceFactory, isResource} from 'react-lazy-data';

// Imports
import {spy, tryCatch, render, defer, tick, act} from './support/utils.js';

// Init
import './support/index.js';

// Tests

// TODO Tests for promise rejection/sync error in fetch function

let factory, fetchFn, promise, resolve, req, resource, App, Component, container;
function prep(options) {
	({promise, resolve} = defer());

	promise.abort = spy();

	fetchFn = spy(() => promise);
	factory = createResourceFactory(fetchFn, options);
	req = {num: 1};

	resource = factory.create(req);

	Component = spy(({resResource}) => {
		const res = resResource.read();
		// Return `.a` property of result if present, or null
		return !res ? null : res.a || null;
	});

	App = spy(() => (
		<Suspense fallback="Loading">
			<Component resResource={resource} />
		</Suspense>
	));

	container = render(<App />);
}

// Flush all pending effects before each test ends so any errors or unhandled rejections make test fail
afterEach(() => {
	act();
});

describe('factory.create', () => {
	describe('no serializer', () => {
		beforeEach(() => {
			prep();
		});

		tests();
	});

	describe('default serializer', () => {
		beforeEach(() => {
			prep({serialize: true});
		});

		tests();
		serializeTests();
	});

	describe('custom serializer', () => {
		beforeEach(() => {
			const serialize = request => `xx_${JSON.stringify(request)}_xx`;
			prep({serialize});
		});

		tests();
		serializeTests();
	});
});

function tests() {
	it('is a function', () => {
		expect(factory.create).toBeFunction();
	});

	it('returns a resource', () => {
		expect(resource).toBeObject();
		expect(isResource(resource)).toBeTrue();
	});

	it('calls fetch function synchronously with request', () => {
		expect(fetchFn).toHaveBeenCalledTimes(1);
		expect(fetchFn).toHaveBeenCalledWith(req);
	});

	it('does not call fetch function again when fetch promise resolves', async () => {
		await resolve();
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	describe('resource.read', () => {
		it('is a function', () => {
			expect(resource.read).toBeFunction();
		});

		describe('before fetch promise resolves', () => {
			it('throws promise', () => {
				const thrown = tryCatch(() => resource.read());
				expect(thrown).toBeInstanceOf(Promise);
			});

			it('throws different promise from promise returned by fetch function', () => {
				const thrown = tryCatch(() => resource.read());
				expect(thrown).not.toBe(promise);
			});

			it('throws same promise if called multiple times', () => {
				const thrown1 = tryCatch(() => resource.read()),
					thrown2 = tryCatch(() => resource.read()),
					thrown3 = tryCatch(() => resource.read());
				expect(thrown1).toBeInstanceOf(Promise);
				expect(thrown2).toBe(thrown1);
				expect(thrown3).toBe(thrown1);
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

		describe('after fetch promise resolves', () => {
			let ret;
			beforeEach(async () => {
				ret = {a: 'abc'};
				await resolve(ret);
			});

			it('returns fetch promise resolution value', () => {
				const readRet = resource.read();
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
		// NB No tests for calling `.dispose()` twice, as this would be considered
		// an incorrect use of the API.

		describe('called before fetch promise resolves', () => {
			it('calls `promise.abort()` synchronously', () => {
				expect(promise.abort).not.toHaveBeenCalled();
				resource.dispose();
				expect(promise.abort).toHaveBeenCalledTimes(1);
			});

			it('leaves promise thrown by `.read()` forever pending', async () => {
				const thrown = tryCatch(() => resource.read());
				const thenSpy = spy();
				thrown.then(thenSpy, thenSpy);

				resource.dispose();
				await resolve();

				expect(thenSpy).not.toHaveBeenCalled();
			});

			it('root not re-rendered', async () => {
				expect(App).toHaveBeenCalledTimes(1);
				resource.dispose();
				await resolve();
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component not re-rendered', async () => {
				expect(Component).toHaveBeenCalledTimes(1);
				resource.dispose();
				await resolve();
				expect(Component).toHaveBeenCalledTimes(1);
			});

			it('leaves Suspense fallback rendered', async () => {
				resource.dispose();
				await resolve();
				expect(container).toContainHTML('Loading');
			});
		});

		describe('called after fetch promise resolves', () => {
			beforeEach(async () => {
				await resolve({a: 'abc'});
			});

			async function dispose() {
				resource.dispose();
				await tick();
				act();
			}

			it('does not call `promise.abort()`', async () => {
				await dispose();
				expect(promise.abort).not.toHaveBeenCalled();
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
				expect(container).toContainHTML('abc');
				await dispose();
				expect(container).toContainHTML('abc');
			});
		});
	});
}

function serializeTests() {
	describe('called again with same request', () => {
		callingTests(() => req);
	});

	describe('called again with request which serializes the same', () => {
		callingTests(() => ({...req}));
	});
}

function callingTests(getReq) {
	describe('before fetch promise resolves', () => {
		let resource2;
		beforeEach(() => {
			// Sanity check
			// eslint-disable-next-line jest/no-standalone-expect
			expect(fetchFn).toHaveBeenCalledTimes(1);

			const req2 = getReq();
			resource2 = factory.create(req2);
		});

		it('does not call fetch function again', () => {
			expect(fetchFn).toHaveBeenCalledTimes(1);
		});

		it('fetch promise resolution resolves both resources', async () => {
			const ret = {a: 'abc'};
			await resolve(ret);
			const res1 = resource.read();
			const res2 = resource2.read();
			expect(res1).toBe(ret);
			expect(res2).toBe(ret);
		});

		it('does not call `promise.abort()`', () => {
			expect(promise.abort).not.toHaveBeenCalled();
		});

		it('does not call `promise.abort()` after 1st resource disposed', async () => {
			resource.dispose();
			await tick();
			expect(promise.abort).not.toHaveBeenCalled();
		});

		it('does not call `promise.abort()` after 2nd resource disposed', async () => {
			resource2.dispose();
			await tick();
			expect(promise.abort).not.toHaveBeenCalled();
		});

		it('calls `promise.abort()` after both resources disposed', async () => {
			resource.dispose();
			resource2.dispose();
			await tick();
			expect(promise.abort).toHaveBeenCalledTimes(1);
		});

		it('clears cache after both resources disposed', async () => {
			resource.dispose();
			resource2.dispose();
			await tick();

			expect(fetchFn).toHaveBeenCalledTimes(1);
			factory.create(req);
			expect(fetchFn).toHaveBeenCalledTimes(2);
		});
	});

	describe('after fetch promise resolves', () => {
		let resource2, ret;
		beforeEach(async () => {
			ret = {a: 'abc'};
			await resolve(ret);

			// Sanity check
			/* eslint-disable jest/no-standalone-expect */
			expect(fetchFn).toHaveBeenCalledTimes(1);
			expect(resource.read()).toBe(ret);
			/* eslint-enable jest/no-standalone-expect */

			const req2 = getReq();
			resource2 = factory.create(req2);
		});

		it('does not call fetch function again', () => {
			expect(fetchFn).toHaveBeenCalledTimes(1);
		});

		it('`.read` on new resource returns result', async () => {
			const res2 = resource2.read();
			expect(res2).toBe(ret);
		});

		it('does not call `promise.abort()` after resources disposed', async () => {
			resource.dispose();
			resource2.dispose();
			await tick();
			expect(promise.abort).not.toHaveBeenCalled();
		});

		it('clears cache after both resources disposed', async () => {
			resource.dispose();
			resource2.dispose();
			await tick();

			expect(fetchFn).toHaveBeenCalledTimes(1);
			factory.create(req);
			expect(fetchFn).toHaveBeenCalledTimes(2);
		});
	});
}
