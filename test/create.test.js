/* --------------------
 * react-lazy-data module
 * Tests for `createResourceFactory()`
 *
 * @jest-environment jsdom
 * ------------------*/

// Modules
// eslint-disable-next-line import/no-unresolved, node/no-missing-import
import {createResourceFactory, isResource} from 'react-lazy-data';
import React, {Suspense} from 'react';

// Imports
import {spy, tryCatch, render, defer, tick, act} from './support/utils.js';

// Init
import './support/index.js';

// Tests

// TODO Tests for promise rejection/sync error in fetch function

describe('factory.create', () => {
	let factory, fetchFn, promise, resolve, req, resource, App, Component, container;
	beforeEach(() => {
		({promise, resolve} = defer());

		promise.abort = spy();

		fetchFn = spy(() => promise);
		factory = createResourceFactory(fetchFn);
		req = {};

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
	});

	// Flush all pending effects before test ends so any errors or unhandled rejections make test fail
	afterEach(() => {
		act();
	});

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
});
