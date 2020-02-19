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
import {spy, awaitSpy, tryCatch, render, defer, tick} from './support/utils.js';

// Init
import './support/index.js';

// Tests

// TODO Tests for promise rejection/sync error in fetch function

describe('factory.create', () => {
	let factory, fetchFn, promise, resolve, isResolved, req,
		resource, rendered, App, Component, container;
	beforeEach(() => {
		({promise, resolve, isResolved} = defer());
		promise.abort = spy();

		fetchFn = awaitSpy(() => promise);
		factory = createResourceFactory(fetchFn);
		req = {};

		resource = factory.create(req);

		// `rendered` called when Component called with resolved resource
		rendered = awaitSpy();

		Component = spy(({resResource}) => {
			const res = resResource.read();
			rendered(res);
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

	// Clean-up - Wait for async processes to complete before test ends
	// so any errors or unhandled rejections make test fail.
	afterEach(async () => {
		// Wait for fetch function to be called before test ends
		await fetchFn.calledOnce();

		// If promise was resolved, wait for render to complete before test ends
		if (isResolved()) {
			await promise;
			await rendered.calledOnce();
			await tick();
		}
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
		resolve();
		await promise;
		await tick();
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

			it('root rendered once only', () => {
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component rendered once only', () => {
				expect(Component).toHaveBeenCalledTimes(1);
			});

			it('renders Suspense fallback', () => {
				expect(container).toContainHTML('Loading');
			});
		});

		describe('after fetch promise resolves', () => {
			let ret;
			beforeEach(async () => {
				ret = {a: 'abc'};
				resolve(ret);
				await promise;
			});

			it('returns fetch promise resolution value', async () => {
				const readRet = resource.read();
				expect(readRet).toBe(ret);
			});

			it('root not re-rendered', async () => {
				await rendered.calledOnce();
				await tick();
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component re-rendered once only', async () => {
				await rendered.calledOnce();
				await tick();
				expect(Component).toHaveBeenCalledTimes(2);
			});

			it('renders component', async () => {
				await rendered.calledOnce();
				expect(container).toContainHTML('abc');
			});
		});
	});

	describe('resource.dispose', () => {
		// TODO Tests for `.dispose()` called a 2nd time

		describe('called before fetch promise resolves', () => {
			async function disposeThenResolve() {
				resource.dispose();
				resolve();
				await promise;
				await tick();

				// Prevent `afterEach` hook waiting for component to be called
				rendered();
			}

			it('calls `promise.abort()` synchronously', () => {
				expect(promise.abort).not.toHaveBeenCalled();
				resource.dispose();
				expect(promise.abort).toHaveBeenCalledTimes(1);
			});

			it('leaves promise thrown by `.read()` forever pending', async () => {
				const thrown = tryCatch(() => resource.read());
				const thenSpy = spy();
				thrown.then(thenSpy, thenSpy);

				await disposeThenResolve();

				expect(thenSpy).not.toHaveBeenCalled();
			});

			it('root not re-rendered', async () => {
				expect(App).toHaveBeenCalledTimes(1);
				await disposeThenResolve();
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component not re-rendered', async () => {
				expect(Component).toHaveBeenCalledTimes(1);
				await disposeThenResolve();
				expect(Component).toHaveBeenCalledTimes(1);
			});

			it('leaves Suspense fallback rendered', async () => {
				await disposeThenResolve();
				expect(container).toContainHTML('Loading');
			});
		});

		describe('called after fetch promise resolves', () => {
			beforeEach(async () => {
				resolve({a: 'abc'});
				await promise;
			});

			it('does not call `promise.abort()`', async () => {
				resource.dispose();
				expect(promise.abort).not.toHaveBeenCalled();
			});

			it('root not re-rendered', async () => {
				await rendered.calledOnce();
				await tick();

				expect(App).toHaveBeenCalledTimes(1);

				resource.dispose();
				await tick();

				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component not re-rendered', async () => {
				await rendered.calledOnce();
				await tick();

				expect(Component).toHaveBeenCalledTimes(2);

				resource.dispose();
				await tick();

				expect(Component).toHaveBeenCalledTimes(2);
			});

			it('leaves content rendered', async () => {
				resource.dispose();

				await rendered.calledOnce();
				await tick();

				expect(container).toContainHTML('abc');
			});
		});
	});
});
