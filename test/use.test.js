/* --------------------
 * react-lazy-data module
 * Tests for `createResourceFactory()`
 *
 * @jest-environment jsdom
 * ------------------*/

// Modules
import React, {Suspense, useState, useCallback} from 'react';
import {createResourceFactory, isResource} from 'react-lazy-data';

// Imports
import {spy, tryCatch, render, defer, tick, act} from './support/utils.js';

// Init
import './support/index.js';

// Tests

// TODO Tests for promise rejection/sync error in fetch function

let factory, fetchFn, reqA, reqB, setReqA, setReqB, forceRerender,
	promise1, promise2, promiseB, resolve1, resolve2, resolveB,
	resource1, resource2, resourceB, fetched2, App, Intermediate, Component, container;
function prep(serialize, getReqB) {
	({promise: promise1, resolve: resolve1} = defer());
	({promise: promise2, resolve: resolve2} = defer());
	({promise: promiseB, resolve: resolveB} = defer());

	promise1.abort = spy();

	let numFetchCalls = 0;
	fetched2 = spy();
	fetchFn = spy(({num}) => {
		numFetchCalls++;
		if (num === 1) return numFetchCalls === 1 ? promise1 : promiseB;
		if (num === 3) return promiseB;
		fetched2();
		return promise2;
	});

	const options = serialize ? {serialize} : undefined;
	factory = createResourceFactory(fetchFn, options);

	reqA = {num: 1};
	reqB = getReqB ? getReqB() : undefined;
	setReqA = undefined;
	setReqB = undefined;
	forceRerender = undefined;
	resource1 = undefined;
	resource2 = undefined;
	resourceB = undefined;

	Component = spy(({resource}) => {
		const res = resource.read();
		// Return `.a` property of result if present, or null
		return !res ? null : res.a || null;
	});

	Intermediate = spy(({req, isComponentB}) => {
		const resource = factory.use(req);
		if (isComponentB) {
			resourceB = resource;
		} else if (req.num === 1) {
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
		let currentReqA, currentReqB;
		[currentReqA, setReqA] = useState(reqA);
		[currentReqB, setReqB] = useState(reqB);

		const [, setCount] = useState(1);
		forceRerender = useCallback(() => setCount(c => c + 1), []);

		return (
			<div>
				{currentReqA ? <Intermediate req={currentReqA} /> : 'NothingA'}
				{currentReqB ? <Intermediate req={currentReqB} isComponentB /> : 'NothingB'}
			</div>
		);
	});

	container = render(<App />);
}

// Flush all pending effects before each test ends so any errors or unhandled rejections make test fail
afterEach(() => {
	act();
});

describe('factory.use', () => {
	describe('no serializer', () => {
		const serialize = undefined;
		tests(serialize);
	});

	describe('default serializer', () => {
		const serialize = true;
		tests(serialize);
	});

	describe('custom serializer', () => {
		const serialize = request => `xx_${JSON.stringify(request)}_xx`;
		tests(serialize);
	});
});

function tests(serialize) {
	describe('...', () => { // Basic tests
		beforeEach(() => {
			prep(serialize);
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
			expect(fetchFn).toHaveBeenCalledWith(reqA);
		});

		it('does not call fetch function again when fetch promise resolves', async () => {
			await resolve1();
			expect(fetchFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('when called again with same request', () => {
		let resourceFromFirstCall;
		beforeEach(() => {
			prep(serialize);
			act();
			resourceFromFirstCall = resource1;
			resource1 = null;

			// Sanity checks
			/* eslint-disable jest/no-standalone-expect */
			expect(isResource(resourceFromFirstCall)).toBeTrue();
			expect(Intermediate).toHaveBeenCalledTimes(1);
			expect(fetchFn).toHaveBeenCalledTimes(1);
			/* eslint-enable jest/no-standalone-expect */

			act(forceRerender);

			// Sanity check
			// eslint-disable-next-line jest/no-standalone-expect
			expect(Intermediate).toHaveBeenCalledTimes(2);
		});

		it('returns same resource', () => {
			expect(resource1).toBe(resourceFromFirstCall);
		});

		it('does not call fetch function again', () => {
			expect(fetchFn).toHaveBeenCalledTimes(1);
		});
	});

	if (serialize) {
		describe('when called again with request which serializes the same', () => {
			let resourceFromFirstCall;
			beforeEach(() => {
				prep(serialize);
				act();
				resourceFromFirstCall = resource1;
				resource1 = null;

				// Sanity checks
				/* eslint-disable jest/no-standalone-expect */
				expect(isResource(resourceFromFirstCall)).toBeTrue();
				expect(Intermediate).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledTimes(1);
				/* eslint-enable jest/no-standalone-expect */

				act(() => setReqA({...reqA}));

				// Sanity check
				// eslint-disable-next-line jest/no-standalone-expect
				expect(Intermediate).toHaveBeenCalledTimes(2);
			});

			it('returns same resource', () => {
				expect(resource1).toBe(resourceFromFirstCall);
			});

			it('does not call fetch function again', () => {
				expect(fetchFn).toHaveBeenCalledTimes(1);
			});
		});
	}

	describe('when called by another component', () => {
		describe('with different request', () => {
			secondUseTests(() => ({num: 3}), true);
		});

		describe('with same request', () => {
			secondUseTests(() => reqA, !serialize);
		});

		if (serialize) {
			describe('with requests which serialize the same', () => {
				secondUseTests(() => ({...reqA}), false);
			});
		}

		function secondUseTests(getReqB, shouldFetchTwice) {
			describe('before fetch function called', () => {
				beforeEach(() => {
					prep(serialize, getReqB);
				});

				it('returns a resource', () => {
					expect(resourceB).toBeObject();
					expect(isResource(resourceB)).toBeTrue();
				});

				it('returns a different resource', () => {
					expect(resource1).toBeObject();
					expect(resourceB).toBeObject();
					expect(resourceB).not.toBe(resource1);
				});

				it('does not call fetch function', () => {
					expect(fetchFn).not.toHaveBeenCalled();
				});

				describe('later', () => {
					beforeEach(act);

					if (shouldFetchTwice) {
						it('calls fetch function twice', () => {
							expect(fetchFn).toHaveBeenCalledTimes(2);
						});

						it('calls fetch function with 1st request', () => {
							expect(fetchFn).toHaveBeenNthCalledWith(1, reqA);
						});

						it('calls fetch function with 2nd request', () => {
							expect(fetchFn).toHaveBeenNthCalledWith(2, reqB);
						});

						it('does not call fetch function again when fetch promises resolve', async () => {
							await resolve1();
							await resolveB();
							expect(fetchFn).toHaveBeenCalledTimes(2);
						});
					} else {
						it('calls fetch function once', () => {
							expect(fetchFn).toHaveBeenCalledTimes(1);
						});

						// eslint-disable-next-line jest/no-identical-title
						it('calls fetch function with 1st request', () => {
							expect(fetchFn).toHaveBeenCalledWith(reqA);
						});

						it('does not call fetch function again when fetch promise resolves', async () => {
							await resolve1();
							expect(fetchFn).toHaveBeenCalledTimes(1);
						});
					}
				});
			});

			describe('before fetch promise resolves', () => {
				beforeEach(() => {
					prep(serialize);

					act();

					// Sanity check
					// eslint-disable-next-line jest/no-standalone-expect
					expect(fetchFn).toHaveBeenCalledTimes(1);

					reqB = getReqB();
					act(() => setReqB(reqB));
				});

				it('returns a resource', () => {
					expect(resourceB).toBeObject();
					expect(isResource(resourceB)).toBeTrue();
				});

				it('returns a different resource', () => {
					expect(resource1).toBeObject();
					expect(resourceB).toBeObject();
					expect(resourceB).not.toBe(resource1);
				});

				if (shouldFetchTwice) {
					it('calls fetch function again', () => {
						expect(fetchFn).toHaveBeenCalledTimes(2);
					});

					it('calls fetch function with 2nd request', () => {
						expect(fetchFn).toHaveBeenNthCalledWith(2, reqB);
					});
				} else {
					it('does not call fetch function again', () => {
						expect(fetchFn).toHaveBeenCalledTimes(1);
					});
				}
			});

			describe('after fetch promise resolves', () => {
				let ret;
				beforeEach(async () => {
					prep(serialize);

					ret = {a: 'abc'};
					await resolve1(ret);

					// Sanity check
					// eslint-disable-next-line jest/no-standalone-expect
					expect(fetchFn).toHaveBeenCalledTimes(1);

					reqB = getReqB();
					act(() => setReqB(reqB));
				});

				it('returns a resource', () => {
					expect(resourceB).toBeObject();
					expect(isResource(resourceB)).toBeTrue();
				});

				it('returns a different resource', () => {
					expect(resource1).toBeObject();
					expect(resourceB).toBeObject();
					expect(resourceB).not.toBe(resource1);
				});

				if (shouldFetchTwice) {
					it('calls fetch function again', () => {
						expect(fetchFn).toHaveBeenCalledTimes(2);
					});

					it('calls fetch function with 2nd request', () => {
						expect(fetchFn).toHaveBeenNthCalledWith(2, reqB);
					});
				} else {
					it('does not call fetch function again', () => {
						expect(fetchFn).toHaveBeenCalledTimes(1);
					});
				}
			});
		}
	});

	describe('resource.read', () => {
		it('is a function', () => {
			prep(serialize);
			expect(resource1.read).toBeFunction();
		});

		describe('with 1 resource', () => {
			beforeEach(() => {
				prep(serialize);
			});

			describe('before fetch function called', () => {
				beforeEach(() => {
					// Sanity check
					// eslint-disable-next-line jest/no-standalone-expect
					expect(fetchFn).not.toHaveBeenCalled();
				});

				it('throws promise', () => {
					const thrown = tryCatch(() => resource1.read());
					expect(thrown).toBeInstanceOf(Promise);
				});

				it('throws same promise if called multiple times', () => {
					const thrown1 = tryCatch(() => resource1.read()),
						thrown2 = tryCatch(() => resource1.read()),
						thrown3 = tryCatch(() => resource1.read());
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

			describe('before fetch promise resolves', () => {
				function ensureFetchFnCalled() {
					act();

					// Sanity check
					expect(fetchFn).toHaveBeenCalledTimes(1);
				}

				it('throws promise', () => {
					ensureFetchFnCalled();
					const thrown = tryCatch(() => resource1.read());
					expect(thrown).toBeInstanceOf(Promise);
				});

				it('throws same promise as before fetch function called', () => {
					const thrownBefore = tryCatch(() => resource1.read());
					expect(fetchFn).not.toHaveBeenCalled();

					ensureFetchFnCalled();
					const thrownAfter = tryCatch(() => resource1.read());

					expect(thrownAfter).toBe(thrownBefore);
				});

				it('throws different promise from promise returned by fetch function', () => {
					ensureFetchFnCalled();
					const thrown = tryCatch(() => resource1.read());
					expect(thrown).not.toBe(promise1);
				});

				it('throws same promise if called multiple times', () => {
					ensureFetchFnCalled();
					const thrown1 = tryCatch(() => resource1.read()),
						thrown2 = tryCatch(() => resource1.read()),
						thrown3 = tryCatch(() => resource1.read());
					expect(thrown1).toBeInstanceOf(Promise);
					expect(thrown2).toBe(thrown1);
					expect(thrown3).toBe(thrown1);
				});

				it('root not re-rendered', () => {
					ensureFetchFnCalled();
					expect(App).toHaveBeenCalledTimes(1);
				});

				it('component not re-rendered', () => {
					ensureFetchFnCalled();
					expect(Component).toHaveBeenCalledTimes(1);
				});

				it('renders Suspense fallback', () => {
					ensureFetchFnCalled();
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

		describe('with 2 resources', () => {
			describe('with different requests', () => {
				twoResourcesTests(() => ({num: 3}), true);
			});

			describe('with same request', () => {
				twoResourcesTests(() => reqA, !serialize);
			});

			if (serialize) {
				describe('with requests which serialize the same', () => {
					twoResourcesTests(() => ({...reqA}), false);
				});
			}

			function twoResourcesTests(getReqB, shouldFetchTwice) {
				beforeEach(() => {
					prep(serialize, getReqB);
				});

				describe('before fetch function called', () => {
					beforeEach(() => {
						// Sanity check
						// eslint-disable-next-line jest/no-standalone-expect
						expect(fetchFn).not.toHaveBeenCalled();
					});

					it('throws promise', () => {
						const thrownA = tryCatch(() => resource1.read());
						const thrownB = tryCatch(() => resourceB.read());
						expect(thrownA).toBeInstanceOf(Promise);
						expect(thrownB).toBeInstanceOf(Promise);
					});

					it('throws different promise for each resource', () => {
						const thrownA = tryCatch(() => resource1.read());
						const thrownB = tryCatch(() => resourceB.read());
						expect(thrownA).toBeInstanceOf(Promise);
						expect(thrownB).toBeInstanceOf(Promise);
						expect(thrownB).not.toBe(thrownA);
					});

					it('throws same promise if called multiple times', () => {
						const thrownA1 = tryCatch(() => resource1.read()),
							thrownA2 = tryCatch(() => resource1.read()),
							thrownA3 = tryCatch(() => resource1.read());
						const thrownB1 = tryCatch(() => resourceB.read()),
							thrownB2 = tryCatch(() => resourceB.read()),
							thrownB3 = tryCatch(() => resourceB.read());
						expect(thrownA1).toBeInstanceOf(Promise);
						expect(thrownA2).toBe(thrownA1);
						expect(thrownA3).toBe(thrownA1);
						expect(thrownB1).toBeInstanceOf(Promise);
						expect(thrownB2).toBe(thrownB1);
						expect(thrownB3).toBe(thrownB1);
					});

					it('root rendered once only', () => {
						act();
						expect(App).toHaveBeenCalledTimes(1);
					});

					it('component rendered once only', () => {
						act();
						expect(Component).toHaveBeenCalledTimes(2); // Once each
					});

					it('renders Suspense fallback', () => {
						expect(container).toContainHTML('Loading');
						act();
						expect(container).toContainHTML('Loading');
					});
				});

				describe('before fetch promise resolves', () => {
					function ensureFetchFnCalled() {
						act();

						// Sanity check
						expect(fetchFn).toHaveBeenCalledTimes(shouldFetchTwice ? 2 : 1);
					}

					it('throws promise', () => {
						ensureFetchFnCalled();
						const thrownA = tryCatch(() => resource1.read());
						const thrownB = tryCatch(() => resourceB.read());
						expect(thrownA).toBeInstanceOf(Promise);
						expect(thrownB).toBeInstanceOf(Promise);
					});

					it('throws same promise as before fetch function called', () => {
						const thrownBeforeA = tryCatch(() => resource1.read());
						const thrownBeforeB = tryCatch(() => resourceB.read());
						expect(fetchFn).not.toHaveBeenCalled();

						ensureFetchFnCalled();
						const thrownAfterA = tryCatch(() => resource1.read());
						const thrownAfterB = tryCatch(() => resourceB.read());

						expect(thrownAfterA).toBe(thrownBeforeA);
						expect(thrownAfterB).toBe(thrownBeforeB);
					});

					it('throws different promise from promise returned by fetch function', () => {
						ensureFetchFnCalled();
						const thrownA = tryCatch(() => resource1.read());
						const thrownB = tryCatch(() => resourceB.read());
						expect(thrownA).not.toBe(promise1);
						expect(thrownB).not.toBe(promiseB);
					});

					it('throws same promise if called multiple times', () => {
						ensureFetchFnCalled();
						const thrownA1 = tryCatch(() => resource1.read()),
							thrownA2 = tryCatch(() => resource1.read()),
							thrownA3 = tryCatch(() => resource1.read());
						const thrownB1 = tryCatch(() => resourceB.read()),
							thrownB2 = tryCatch(() => resourceB.read()),
							thrownB3 = tryCatch(() => resourceB.read());
						expect(thrownA1).toBeInstanceOf(Promise);
						expect(thrownA2).toBe(thrownA1);
						expect(thrownA3).toBe(thrownA1);
						expect(thrownB1).toBeInstanceOf(Promise);
						expect(thrownB2).toBe(thrownB1);
						expect(thrownB3).toBe(thrownB1);
					});

					it('root not re-rendered', () => {
						ensureFetchFnCalled();
						expect(App).toHaveBeenCalledTimes(1);
					});

					it('component not re-rendered', () => {
						ensureFetchFnCalled();
						expect(Component).toHaveBeenCalledTimes(2); // Once each
					});

					it('renders Suspense fallback', () => {
						ensureFetchFnCalled();
						expect(container).toContainHTML('Loading');
					});
				});

				describe('after fetch promise resolves', () => {
					let ret, retB;
					beforeEach(async () => {
						ret = {a: 'abc'};
						retB = shouldFetchTwice ? {a: 'ghi'} : ret;
						await Promise.all([
							resolve1(ret),
							shouldFetchTwice ? resolveB(retB) : undefined
						]);

						// Sanity check
						// eslint-disable-next-line jest/no-standalone-expect
						expect(fetchFn).toHaveBeenCalledTimes(shouldFetchTwice ? 2 : 1);
					});

					it('returns fetch promise resolution value', () => {
						const readRet = resource1.read();
						expect(readRet).toBe(ret);
						const readRetB = resourceB.read();
						expect(readRetB).toBe(retB);
					});

					it('root not re-rendered', () => {
						expect(App).toHaveBeenCalledTimes(1);
					});

					it('component re-rendered once only', () => {
						expect(Component).toHaveBeenCalledTimes(4); // Twice each
					});

					it('renders component', () => {
						expect(container).toContainHTML(
							shouldFetchTwice ? 'abcghi' : 'abcabc'
						);
					});
				});
			}
		});
	});

	describe('resource.dispose', () => {
		// NB No tests for calling `.dispose()` twice, as this would be considered
		// an incorrect use of the API.

		// NB No tests for caching because really `.dispose()` shouldn't be used with `.use()` anyway.

		describe('called before fetch function called', () => {
			beforeEach(() => {
				prep(serialize);
			});

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
				prep(serialize);
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
				prep(serialize);
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

	describe('auto-disposal', () => {
		describe('when request changes', () => {
			describe('before fetch function called', () => {
				let reqA2;
				beforeEach(() => {
					prep(serialize);

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(1);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(1);
					expect(fetchFn).not.toHaveBeenCalled();
					expect(promise1.abort).not.toHaveBeenCalled();
					/* eslint-enable jest/no-standalone-expect */

					reqA2 = {num: 2};
					act(() => setReqA(reqA2));

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
					expect(fetchFn).toHaveBeenNthCalledWith(1, reqA);
					expect(fetchFn).toHaveBeenNthCalledWith(2, reqA2);
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

				secondUseAutoDisposeTests(2);
			});

			describe('before fetch promise resolves', () => {
				let reqA2;
				beforeEach(() => {
					prep(serialize);
					act();

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(1);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledWith(reqA);
					expect(promise1.abort).not.toHaveBeenCalled();
					/* eslint-enable jest/no-standalone-expect */

					reqA2 = {num: 2};
					act(() => setReqA(reqA2));
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
					expect(fetchFn).toHaveBeenLastCalledWith(reqA2);
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

				secondUseAutoDisposeTests(2);
			});

			describe('after fetch promise resolves', () => {
				let reqA2;
				beforeEach(async () => {
					prep(serialize);
					await resolve1({a: 'abc'});

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(1);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(2);
					expect(fetchFn).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledWith(reqA);
					expect(promise1.abort).not.toHaveBeenCalled();
					expect(container).toContainHTML('abc');
					/* eslint-enable jest/no-standalone-expect */

					reqA2 = {num: 2};
					act(() => setReqA(reqA2));
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
					expect(fetchFn).toHaveBeenLastCalledWith(reqA2);
				});

				it('renders Suspense fallback', () => {
					expect(container).toContainHTML('Loading');
				});

				it('renders content once 2nd promise resolves', async () => {
					await resolve2({a: 'def'});
					expect(container).toContainHTML('def');
				});

				secondUseAutoDisposeTests(2);
			});
		});

		describe('when component calling `.use()` is unmounted', () => {
			describe('before fetch function called', () => {
				beforeEach(() => {
					prep(serialize);

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(1);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(1);
					expect(fetchFn).not.toHaveBeenCalled();
					expect(promise1.abort).not.toHaveBeenCalled();
					/* eslint-enable jest/no-standalone-expect */

					act(() => setReqA(null));

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(2);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledWith(reqA);
					expect(container).toContainHTML('NothingA');
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

				secondUseAutoDisposeTests(1);
			});

			describe('before fetch promise resolves', () => {
				beforeEach(() => {
					prep(serialize);
					act();

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(1);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledWith(reqA);
					expect(promise1.abort).not.toHaveBeenCalled();
					/* eslint-enable jest/no-standalone-expect */

					act(() => setReqA(null));

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(2);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledTimes(1);
					expect(container).toContainHTML('NothingA');
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

				secondUseAutoDisposeTests(1);
			});

			describe('after fetch promise resolves', () => {
				beforeEach(async () => {
					prep(serialize);
					await resolve1({a: 'abc'});

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(1);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(2);
					expect(fetchFn).toHaveBeenCalledTimes(1);
					expect(fetchFn).toHaveBeenCalledWith(reqA);
					expect(promise1.abort).not.toHaveBeenCalled();
					expect(container).toContainHTML('abc');
					/* eslint-enable jest/no-standalone-expect */

					act(() => setReqA(null));

					// Sanity checks
					/* eslint-disable jest/no-standalone-expect */
					expect(App).toHaveBeenCalledTimes(2);
					expect(Intermediate).toHaveBeenCalledTimes(1);
					expect(Component).toHaveBeenCalledTimes(2);
					expect(fetchFn).toHaveBeenCalledTimes(1);
					expect(container).toContainHTML('NothingA');
					/* eslint-enable jest/no-standalone-expect */
				});

				it('does not abort promise', () => {
					expect(promise1.abort).not.toHaveBeenCalled();
				});

				secondUseAutoDisposeTests(1);
			});
		});

		function secondUseAutoDisposeTests(numFetchCalls) {
			describe('2nd `.use()` in another component', () => {
				describe('with different request', () => {
					secondUseAutoDisposeWithReqTests(() => ({num: 3}), numFetchCalls);
				});

				describe('with same request', () => {
					secondUseAutoDisposeWithReqTests(() => reqA, numFetchCalls);
				});

				if (serialize) {
					describe('with requests which serialize the same', () => {
						secondUseAutoDisposeWithReqTests(() => ({...reqA}), numFetchCalls);
					});
				}
			});
		}

		function secondUseAutoDisposeWithReqTests(getReqB, numFetchCalls) {
			beforeEach(() => {
				reqB = getReqB();

				// Sanity check
				expect(fetchFn).toHaveBeenCalledTimes(numFetchCalls);

				act(() => setReqB(reqB));
			});

			it('returns a resource', () => {
				expect(resourceB).toBeObject();
				expect(isResource(resourceB)).toBeTrue();
			});

			it('returns a different resource', () => {
				expect(resource1).toBeObject();
				if (numFetchCalls > 1) expect(resource2).toBeObject();
				expect(resourceB).toBeObject();
				expect(resourceB).not.toBe(resource1);
				expect(resourceB).not.toBe(resource2);
			});

			it('calls fetch function again', () => {
				expect(fetchFn).toHaveBeenCalledTimes(numFetchCalls + 1);
			});

			it('calls fetch function with new request', () => {
				expect(fetchFn).toHaveBeenNthCalledWith(numFetchCalls + 1, reqB);
			});

			it('does not call fetch function again when fetch promise resolves', async () => {
				await resolveB();
				expect(fetchFn).toHaveBeenCalledTimes(numFetchCalls + 1);
			});
		}

		describe('with two components using `.use()`', () => {
			describe('with different request following disposal', () => {
				twoComponentAutoDisposeTests(() => ({num: 4}), true);
			});

			describe('with same request following disposal', () => {
				twoComponentAutoDisposeTests(() => reqA, false);
			});

			if (serialize) {
				describe('with request which serializes the same following disposal', () => {
					twoComponentAutoDisposeTests(() => ({...reqA}), false);
				});
			}

			function twoComponentAutoDisposeTests(getReq2, isDifferentRequest) {
				describe('before fetch function called', () => {
					twoComponentAutoDisposeWithPreTests(() => {});
				});

				describe('before fetch promises resolve', () => {
					twoComponentAutoDisposeWithPreTests(() => {
						act();
					});
				});

				describe('after fetch promises resolve', () => {
					twoComponentAutoDisposeWithPreTests(async () => {
						await resolve1();
						if (!serialize) await resolveB();
					});
				});

				function twoComponentAutoDisposeWithPreTests(pre) {
					let req2, previousResource, newResource;
					beforeEach(() => {
						prep(serialize, () => reqA);
						previousResource = resource1;

						// Sanity check
						expect(previousResource).toBeObject();
						expect(isResource(previousResource)).toBeTrue();
						expect(resource2).toBeUndefined();

						resource1 = undefined;

						// Get to required stage before disposing
						const prePromise = pre();

						// Hide both components
						act(() => {
							setReqA(null);
							setReqB(null);
						});

						// Sanity check
						expect(fetchFn).toHaveBeenCalledTimes(serialize ? 1 : 2);

						// Show component A again, calling `.use()` again
						req2 = getReq2();
						act(() => setReqA(req2));

						newResource = isDifferentRequest ? resource2 : resource1;

						return prePromise;
					});

					it('returns a resource', () => {
						expect(newResource).toBeObject();
						expect(isResource(newResource)).toBeTrue();
					});

					it('returns a different resource', () => {
						expect(newResource).toBeObject();
						expect(isResource(newResource)).toBeTrue();
						expect(newResource).not.toBe(previousResource);
					});

					it('calls fetch function again', () => {
						expect(fetchFn).toHaveBeenCalledTimes(serialize ? 2 : 3);
					});

					it('calls fetch function with latest request', () => {
						expect(fetchFn).toHaveBeenNthCalledWith(serialize ? 2 : 3, req2);
					});
				}
			}
		});
	});
}
