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

describe('factory.use', () => {
	let factory, fetchFn, promise, resolve, isResolved, req,
		resource, rendered, App, Component, container;
	beforeEach(() => {
		({promise, resolve, isResolved} = defer());
		promise.abort = spy();

		fetchFn = awaitSpy(() => promise);
		factory = createResourceFactory(fetchFn);
		req = {};

		// `rendered` called when Component called with resolved resource
		rendered = awaitSpy();

		Component = spy(({resResource}) => {
			const res = resResource.read();
			rendered(res);
			// Return `.a` property of result if present, or null
			return !res ? null : res.a || null;
		});

		App = spy(() => {
			resource = factory.use(req);
			return (
				<Suspense fallback="Loading">
					<Component resResource={resource} />
				</Suspense>
			);
		});

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
		expect(factory.use).toBeFunction();
	});

	it('returns a resource', () => {
		expect(resource).toBeObject();
		expect(isResource(resource)).toBeTrue();
	});

	it('does not call fetch function synchronously', () => {
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('calls fetch function asynchronously with request', async () => {
		await fetchFn.calledOnce();
		expect(fetchFn).toHaveBeenCalledTimes(1);
		expect(fetchFn).toHaveBeenCalledWith(req);
	});

	it('does not call fetch function again when fetch promise resolves', async () => {
		await fetchFn.calledOnce();
		resolve();
		await promise;
		await rendered.calledOnce();
		await tick();
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	describe('resource.read', () => {
		it('is a function', () => {
			expect(resource.read).toBeFunction();
		});

		describe('before fetch function called', () => {
			it('throws promise', () => {
				const thrown = tryCatch(() => resource.read());
				expect(fetchFn).not.toHaveBeenCalled();
				expect(thrown).toBeInstanceOf(Promise);
			});

			it('root rendered once only', () => {
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component rendered once only', () => {
				expect(Component).toHaveBeenCalledTimes(1);
			});

			it('renders Suspense fallback', () => {
				expect(fetchFn).not.toHaveBeenCalled();
				expect(container).toContainHTML('Loading');
			});
		});

		describe('before fetch promise resolves', () => {
			it('throws promise', async () => {
				await fetchFn.calledOnce();
				const thrown = tryCatch(() => resource.read());
				expect(thrown).toBeInstanceOf(Promise);
			});

			it('throws same promise as before fetch function called', async () => {
				const thrownBefore = tryCatch(() => resource.read());
				expect(fetchFn).not.toHaveBeenCalled();

				await fetchFn.calledOnce();
				const thrownAfter = tryCatch(() => resource.read());

				expect(thrownAfter).toBe(thrownBefore);
			});

			it('throws different promise from promise returned by fetch function', async () => {
				await fetchFn.calledOnce();
				const thrown = tryCatch(() => resource.read());
				expect(thrown).not.toBe(promise);
			});

			it('root not re-rendered', async () => {
				await fetchFn.calledOnce();
				await tick();
				expect(App).toHaveBeenCalledTimes(1);
			});

			it('component not re-rendered', async () => {
				await fetchFn.calledOnce();
				await tick();
				expect(Component).toHaveBeenCalledTimes(1);
			});

			it('renders Suspense fallback', async () => {
				await fetchFn.calledOnce();
				expect(container).toContainHTML('Loading');
			});
		});

		describe('after fetch promise resolves', () => {
			let ret;
			beforeEach(async () => {
				ret = {a: 'abc'};
				await fetchFn.calledOnce();
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

		describe('called before fetch function called', () => {
			afterEach(() => {
				// Prevent parent `afterEach` hook waiting for fetch function to be called
				fetchFn();
			});

			it('prevents fetch function being called', async () => {
				resource.dispose();
				await tick();

				expect(fetchFn).not.toHaveBeenCalled();
			});

			it('leaves promise thrown by `.read()` forever pending', async () => {
				const thrown = tryCatch(() => resource.read());
				const thenSpy = spy();
				thrown.then(thenSpy, thenSpy);

				resource.dispose();
				resolve();
				await promise;
				await tick();

				expect(thenSpy).not.toHaveBeenCalled();

				// Prevent `afterEach` hook waiting for component to be called
				rendered();
			});
		});

		describe('called before fetch promise resolves', () => {
			beforeEach(async () => {
				await fetchFn.calledOnce();
			});

			async function disposeThenResolve() {
				resource.dispose();
				resolve();
				await promise;
				await tick();

				// Prevent `afterEach` hook waiting for component to be called
				rendered();
			}

			it('calls `promise.abort()`', async () => {
				expect(promise.abort).not.toHaveBeenCalled();
				resource.dispose();
				expect(promise.abort).toHaveBeenCalledTimes(1);
			});

			it('leaves promise thrown by `.read()` forever pending', async () => {
				const thrown = tryCatch(() => resource.read());
				const thenSpy = spy();
				thrown.then(thenSpy, thenSpy);

				disposeThenResolve();

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
				await fetchFn.calledOnce();
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

describe('auto-disposal', () => {
	describe('when request changes', () => {
		let factory, fetchFn, req1, req2, setReq, promise1, promise2, resolve1, resolve2,
			resource1, resource2, fetched2, rendered,
			App, renderApp, Intermediate, Component, container;
		beforeEach(() => {
			({promise: promise1, resolve: resolve1} = defer());
			({promise: promise2, resolve: resolve2} = defer());

			promise1.abort = spy();

			fetched2 = spy();
			fetchFn = awaitSpy(({num}) => {
				if (num === 1) return promise1;
				fetched2();
				return promise2;
			});

			factory = createResourceFactory(fetchFn);

			req1 = {num: 1};
			req2 = {num: 2};

			// `rendered` called when Component called with resolved resource
			rendered = awaitSpy();

			Component = awaitSpy(({resource}) => {
				const res = resource.read();
				rendered(res);
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

			App = class extends React.Component {
				constructor(props) {
					super(props);
					this.state = {req: req1};

					setReq = req => this.setState({req});
				}
			};

			renderApp = spy(function() {
				return <Intermediate req={this.state.req} />; // eslint-disable-line no-invalid-this
			});

			App.prototype.render = renderApp;

			container = render(<App />);
		});

		describe('before fetch function called', () => {
			beforeEach(async () => {
				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(renderApp).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).not.toHaveBeenCalled();
				expect(promise1.abort).not.toHaveBeenCalled();
				expect(rendered).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				setReq(req2);

				await fetchFn.calledOnce();

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(renderApp).toHaveBeenCalledTimes(2);
				expect(Intermediate).toHaveBeenCalledTimes(2);
				expect(Component).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req1);
				expect(promise1.abort).not.toHaveBeenCalled();
				expect(rendered).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				await fetchFn.calledTwice();
			});

			it('`.use()` returns a new resource', () => {
				expect(resource1).toBeObject();
				expect(resource2).toBeObject();
				expect(resource2).not.toBe(resource1);
			});

			it('aborts promise', () => {
				expect(promise1.abort).toHaveBeenCalledTimes(1);
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

			it('leaves Suspense fallback rendered', async () => {
				expect(container).toContainHTML('Loading');
			});

			it('renders content once 2nd promise resolves', async () => {
				resolve2({a: 'def'});
				await rendered.calledOnce();
				await tick();
				expect(container).toContainHTML('def');
			});
		});

		describe('before fetch promise resolves', () => {
			beforeEach(async () => {
				await fetchFn.calledOnce();

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(renderApp).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req1);
				expect(promise1.abort).not.toHaveBeenCalled();
				expect(rendered).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				setReq(req2);

				await fetchFn.calledTwice();
			});

			it('`.use()` returns a new resource', () => {
				expect(resource1).toBeObject();
				expect(resource2).toBeObject();
				expect(resource2).not.toBe(resource1);
			});

			it('aborts promise', () => {
				expect(promise1.abort).toHaveBeenCalledTimes(1);
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

			it('leaves Suspense fallback rendered', async () => {
				expect(container).toContainHTML('Loading');
			});

			it('renders content once 2nd promise resolves', async () => {
				resolve2({a: 'def'});
				await rendered.calledOnce();
				await tick();
				expect(container).toContainHTML('def');
			});
		});

		describe('after fetch promise resolves', () => {
			beforeEach(async () => {
				resolve1({a: 'abc'});
				await promise1;
				await rendered.calledOnce();
				await tick();

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(renderApp).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req1);
				expect(promise1.abort).not.toHaveBeenCalled();
				expect(rendered).toHaveBeenCalledTimes(1);
				expect(container).toContainHTML('abc');
				/* eslint-enable jest/no-standalone-expect */

				setReq(req2);

				await fetchFn.calledTwice();
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

			it('renders Suspense fallback', async () => {
				expect(container).toContainHTML('Loading');
			});

			it('renders content once 2nd promise resolves', async () => {
				resolve2({a: 'def'});
				await rendered.calledTwice();
				await tick();
				expect(container).toContainHTML('def');
			});
		});
	});

	// eslint-disable-next-line jest/no-disabled-tests
	describe.skip('when component unmounts', () => {
		// eslint-disable-next-line no-unused-vars
		let factory, fetchFn, req, setReq, promise, resolve, resource, rendered,
			// eslint-disable-next-line no-unused-vars
			App, renderApp, Intermediate, Component, container;
		beforeEach(() => {
			({promise, resolve} = defer());

			promise.abort = spy();

			fetchFn = awaitSpy(() => promise);

			factory = createResourceFactory(fetchFn);

			req = {num: 1};

			// `rendered` called when Component called with resolved resource
			rendered = awaitSpy();

			Component = awaitSpy(({resResource}) => {
				const res = resResource.read();
				rendered(res);
				// Return `.a` property of result if present, or null
				return !res ? null : res.a || null;
			});

			Intermediate = spy((props) => {
				resource = factory.use(props.req);

				return (
					<Suspense fallback="Loading">
						<Component resResource={resource} />
					</Suspense>
				);
			});

			App = class extends React.Component {
				constructor(props) {
					super(props);
					this.state = {req};

					setReq = newReq => this.setState({req: newReq});
				}
			};

			renderApp = spy(function() {
				const reqLocal = this.state.req; // eslint-disable-line no-invalid-this
				if (!reqLocal) return null;
				return <Intermediate req={reqLocal} />;
			});

			App.prototype.render = renderApp;

			container = render(<App />);
		});

		describe('before fetch function called', () => {
			beforeEach(async () => {
				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(renderApp).toHaveBeenCalledTimes(1);
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(Component).toHaveBeenCalledTimes(1);
				expect(fetchFn).not.toHaveBeenCalled();
				expect(promise.abort).not.toHaveBeenCalled();
				expect(rendered).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				setReq(null);

				await fetchFn.calledOnce();

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(renderApp).toHaveBeenCalledTimes(2);
				expect(Intermediate).toHaveBeenCalledTimes(2);
				expect(Component).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(req);
				expect(promise.abort).not.toHaveBeenCalled();
				expect(rendered).not.toHaveBeenCalled();
				/* eslint-enable jest/no-standalone-expect */

				await fetchFn.calledTwice();
			});

			// TODO Write tests!
		});

		describe('before fetch promise resolves', () => {
			// TODO Write tests!
		});

		describe('after fetch promise resolves', () => {
			// TODO Write tests!
		});
	});
});
