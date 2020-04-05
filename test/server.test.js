/* --------------------
 * react-lazy-data module
 * Tests for server
 *
 * @jest-environment node
 * ------------------*/

// Modules
import React, {Suspense} from 'react';
/* eslint-disable import/no-unresolved, node/no-missing-import */
import {createResourceFactory} from 'react-lazy-data';
import {DataExtractor} from 'react-lazy-data/server';
/* eslint-enable import/no-unresolved, node/no-missing-import */
import {renderToStringAsync} from 'react-async-ssr';

// Imports
// NB Import direct from `spy.js` rather than from `utils.js` as other code in `utils.js`
// causes an error with React 16.8.0 (`react-dom/test-utils` errors)
import spy from './support/spy.js';

// Init
import './support/index.js';

// Tests

describe('DataExtractor', () => { // eslint-disable-line jest/lowercase-name
	it('is a class', () => {
		expect(DataExtractor).toBeFunction();
		const extractor = new DataExtractor();
		expect(extractor).toBeObject();
	});
});

describe('rendering on server side', () => {
	describe('renders content including data', () => {
		describe('one component', () => {
			let html, extractor;
			beforeEach(async () => {
				const resourceFactory = createResourceFactory(
					id => Promise.resolve({msg: `Loaded ${id}`}),
					{id: 'res'}
				);

				function App() {
					const resource = resourceFactory.use(1);
					return (
						<div>
							<Suspense fallback={<span>Loading</span>}>
								<Component resource={resource} />
							</Suspense>
						</div>
					);
				}

				function Component({resource}) {
					const data = resource.read();
					return <span>{data.msg}</span>;
				}

				extractor = new DataExtractor();
				html = await renderToStringAsync(extractor.collectData(<App />));
			});

			it('renders correct HTML', async () => {
				expect(html).toBe('<div data-reactroot=""><span>Loaded 1</span></div>');
			});

			it('extractor.getData() returns data cache as object', async () => {
				const cache = extractor.getData();
				expect(cache).toEqual({res: {1: {msg: 'Loaded 1'}}});
			});

			it('extractor.getScript() returns data cache as script', async () => {
				const scriptHtml = extractor.getScript();
				expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res":{"1":{"msg":"Loaded 1"}}}</script>');
			});
		});

		describe('component with delay before fetch promise resolves', () => {
			let html, extractor;
			beforeEach(async () => {
				const resourceFactory = createResourceFactory(
					id => new Promise(resolve => setTimeout(() => resolve({msg: `Loaded ${id}`}), 100)),
					{id: 'res'}
				);

				function App() {
					const resource = resourceFactory.use(1);
					return (
						<div>
							<Suspense fallback={<span>Loading</span>}>
								<Component resource={resource} />
							</Suspense>
						</div>
					);
				}

				function Component({resource}) {
					const data = resource.read();
					return <span>{data.msg}</span>;
				}

				extractor = new DataExtractor();
				html = await renderToStringAsync(extractor.collectData(<App />));
			});

			it('renders correct HTML', async () => {
				expect(html).toBe('<div data-reactroot=""><span>Loaded 1</span></div>');
			});

			it('extractor.getData() returns data cache as object', async () => {
				const cache = extractor.getData();
				expect(cache).toEqual({res: {1: {msg: 'Loaded 1'}}});
			});

			it('extractor.getScript() returns data cache as script', async () => {
				const scriptHtml = extractor.getScript();
				expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res":{"1":{"msg":"Loaded 1"}}}</script>');
			});
		});

		describe('component with synchronous thenable returned by fetch function', () => {
			let html, extractor;
			beforeEach(async () => {
				const resourceFactory = createResourceFactory(
					id => ({then: fn => fn({msg: `Loaded ${id}`})}),
					{id: 'res'}
				);

				function App() {
					const resource = resourceFactory.use(1);
					return (
						<div>
							<Suspense fallback={<span>Loading</span>}>
								<Component resource={resource} />
							</Suspense>
						</div>
					);
				}

				function Component({resource}) {
					const data = resource.read();
					return <span>{data.msg}</span>;
				}

				extractor = new DataExtractor();
				html = await renderToStringAsync(extractor.collectData(<App />));
			});

			it('renders correct HTML', async () => {
				expect(html).toBe('<div data-reactroot=""><span>Loaded 1</span></div>');
			});

			// Next 2 tests skipped as does not work at present due to bug in react-async-ssr
			// https://github.com/overlookmotel/react-async-ssr/issues/64
			// TODO Enable these tests once react-async-ssr is fixed
			/* eslint-disable jest/no-disabled-tests */
			it.skip('extractor.getData() returns data cache as object', async () => {
				const cache = extractor.getData();
				expect(cache).toEqual({res: {1: {msg: 'Loaded 1'}}});
			});

			it.skip('extractor.getScript() returns data cache as script', async () => {
				const scriptHtml = extractor.getScript();
				expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res":{"1":{"msg":"Loaded 1"}}}</script>');
			});
			/* eslint-enable jest/no-disabled-tests */
		});

		describe('two components', () => {
			let html, extractor;
			beforeEach(async () => {
				const resourceFactory = createResourceFactory(
					id => Promise.resolve({msg: `Loaded ${id}`}),
					{id: 'res'}
				);

				function App() {
					const resource1 = resourceFactory.use(1);
					const resource2 = resourceFactory.use(2);
					return (
						<div>
							<Suspense fallback={<span>Loading</span>}>
								<Component resource={resource1} />
								<Component resource={resource2} />
							</Suspense>
						</div>
					);
				}

				function Component({resource}) {
					const data = resource.read();
					return <span>{data.msg}</span>;
				}

				extractor = new DataExtractor();
				html = await renderToStringAsync(extractor.collectData(<App />));
			});

			it('renders correct HTML', async () => {
				expect(html).toBe('<div data-reactroot=""><span>Loaded 1</span><span>Loaded 2</span></div>');
			});

			it('extractor.getData() returns data cache as object', async () => {
				const cache = extractor.getData();
				expect(cache).toEqual({res: {1: {msg: 'Loaded 1'}, 2: {msg: 'Loaded 2'}}});
			});

			it('extractor.getScript() returns data cache as script', async () => {
				const scriptHtml = extractor.getScript();
				expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res":{"1":{"msg":"Loaded 1"},"2":{"msg":"Loaded 2"}}}</script>');
			});
		});

		describe('two resource factories', () => {
			let html, extractor;
			beforeEach(async () => {
				const resourceFactory1 = createResourceFactory(
					id => Promise.resolve({msg: `Loaded1 ${id}`}),
					{id: 'res1'}
				);

				const resourceFactory2 = createResourceFactory(
					id => Promise.resolve({msg: `Loaded2 ${id}`}),
					{id: 'res2'}
				);

				function App() {
					const resource1 = resourceFactory1.use(1);
					const resource2 = resourceFactory2.use(2);
					return (
						<div>
							<Suspense fallback={<span>Loading</span>}>
								<Component resource={resource1} />
								<Component resource={resource2} />
							</Suspense>
						</div>
					);
				}

				function Component({resource}) {
					const data = resource.read();
					return <span>{data.msg}</span>;
				}

				extractor = new DataExtractor();
				html = await renderToStringAsync(extractor.collectData(<App />));
			});

			it('renders correct HTML', async () => {
				expect(html).toBe('<div data-reactroot=""><span>Loaded1 1</span><span>Loaded2 2</span></div>');
			});

			it('extractor.getData() returns data cache as object', async () => {
				const cache = extractor.getData();
				expect(cache).toEqual({res1: {1: {msg: 'Loaded1 1'}}, res2: {2: {msg: 'Loaded2 2'}}});
			});

			it('extractor.getScript() returns data cache as script', async () => {
				const scriptHtml = extractor.getScript();
				expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res1":{"1":{"msg":"Loaded1 1"}},"res2":{"2":{"msg":"Loaded2 2"}}}</script>');
			});
		});
	});

	describe('renders fallback when `noSsr` option used', () => {
		describe('one component', () => {
			let html, extractor, fetchFn;
			beforeEach(async () => {
				fetchFn = spy();
				const resourceFactory = createResourceFactory(fetchFn, {noSsr: true});

				function App() {
					const resource = resourceFactory.use(1);
					return (
						<div>
							<Suspense fallback={<span>Loading</span>}>
								<Component resource={resource} />
							</Suspense>
						</div>
					);
				}

				function Component({resource}) {
					const data = resource.read();
					return <span>{data.msg}</span>;
				}

				extractor = new DataExtractor();
				html = await renderToStringAsync(extractor.collectData(<App />));
			});

			it('does not call fetch function', async () => {
				expect(fetchFn).not.toHaveBeenCalled();
			});

			it('renders fallback HTML', async () => {
				expect(html).toBe('<div data-reactroot=""><span>Loading</span></div>');
			});

			it('extractor.getData() returns empty data cache as object', async () => {
				const cache = extractor.getData();
				expect(cache).toEqual({});
			});

			it('extractor.getScript() returns empty data cache as script', async () => {
				const scriptHtml = extractor.getScript();
				expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={}</script>');
			});
		});

		describe('two components', () => {
			let html, extractor, fetchFn;
			beforeEach(async () => {
				fetchFn = spy();
				const resourceFactory = createResourceFactory(fetchFn, {noSsr: true});

				function App() {
					const resource1 = resourceFactory.use(1);
					const resource2 = resourceFactory.use(2);
					return (
						<div>
							<Suspense fallback={<span>Loading</span>}>
								<Component resource={resource1} />
								<Component resource={resource2} />
							</Suspense>
						</div>
					);
				}

				function Component({resource}) {
					const data = resource.read();
					return <span>{data.msg}</span>;
				}

				extractor = new DataExtractor();
				html = await renderToStringAsync(extractor.collectData(<App />));
			});

			it('does not call fetch function', async () => {
				expect(fetchFn).not.toHaveBeenCalled();
			});

			it('renders fallback HTML', async () => {
				expect(html).toBe('<div data-reactroot=""><span>Loading</span></div>');
			});

			it('extractor.getData() returns empty data cache as object', async () => {
				const cache = extractor.getData();
				expect(cache).toEqual({});
			});

			it('extractor.getScript() returns empty data cache as script', async () => {
				const scriptHtml = extractor.getScript();
				expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={}</script>');
			});
		});

		describe('two resource factories', () => {
			describe('both flagged `noSsr`', () => {
				let html, extractor, fetchFn1, fetchFn2;
				beforeEach(async () => {
					fetchFn1 = spy();
					fetchFn2 = spy();
					const resourceFactory1 = createResourceFactory(fetchFn1, {noSsr: true});
					const resourceFactory2 = createResourceFactory(fetchFn2, {noSsr: true});

					function App() {
						const resource1 = resourceFactory1.use(1);
						const resource2 = resourceFactory2.use(2);
						return (
							<div>
								<Suspense fallback={<span>Loading</span>}>
									<Component resource={resource1} />
									<Component resource={resource2} />
								</Suspense>
							</div>
						);
					}

					function Component({resource}) {
						const data = resource.read();
						return <span>{data.msg}</span>;
					}

					extractor = new DataExtractor();
					html = await renderToStringAsync(extractor.collectData(<App />));
				});

				it('does not call fetch functions', async () => {
					expect(fetchFn1).not.toHaveBeenCalled();
					expect(fetchFn2).not.toHaveBeenCalled();
				});

				it('renders fallback HTML', async () => {
					expect(html).toBe('<div data-reactroot=""><span>Loading</span></div>');
				});

				it('extractor.getData() returns empty data cache as object', async () => {
					const cache = extractor.getData();
					expect(cache).toEqual({});
				});

				it('extractor.getScript() returns empty data cache as script', async () => {
					const scriptHtml = extractor.getScript();
					expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={}</script>');
				});
			});

			describe('first flagged `noSsr`', () => {
				let html, extractor, fetchFn1, fetchFn2, promise2;
				beforeEach(async () => {
					fetchFn1 = spy();
					fetchFn2 = spy((id) => {
						promise2 = Promise.resolve({msg: `Loaded2 ${id}`});
						promise2.abort = spy();
						return promise2;
					});
					const resourceFactory1 = createResourceFactory(fetchFn1, {noSsr: true});
					const resourceFactory2 = createResourceFactory(fetchFn2);

					function App() {
						const resource1 = resourceFactory1.use(1);
						const resource2 = resourceFactory2.use(2);
						return (
							<div>
								<Suspense fallback={<span>Loading</span>}>
									<Component resource={resource1} />
									<Component resource={resource2} />
								</Suspense>
							</div>
						);
					}

					function Component({resource}) {
						const data = resource.read();
						return <span>{data.msg}</span>;
					}

					extractor = new DataExtractor();
					html = await renderToStringAsync(extractor.collectData(<App />));
				});

				it('calls 2nd fetch function only', async () => {
					expect(fetchFn1).not.toHaveBeenCalled();
					expect(fetchFn2).toHaveBeenCalledTimes(1);
				});

				it('calls `.abort()` on 2nd fetch promise', async () => {
					expect(promise2.abort).toHaveBeenCalledTimes(1);
				});

				it('renders fallback HTML', async () => {
					expect(html).toBe('<div data-reactroot=""><span>Loading</span></div>');
				});

				it('extractor.getData() returns empty data cache as object', async () => {
					const cache = extractor.getData();
					expect(cache).toEqual({});
				});

				it('extractor.getScript() returns empty data cache as script', async () => {
					const scriptHtml = extractor.getScript();
					expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={}</script>');
				});
			});

			describe('2nd flagged `noSsr`', () => {
				let html, extractor, fetchFn1, fetchFn2, promise1;
				beforeEach(async () => {
					fetchFn1 = spy((id) => {
						promise1 = Promise.resolve({msg: `Loaded1 ${id}`});
						promise1.abort = spy();
						return promise1;
					});
					fetchFn2 = spy();
					const resourceFactory1 = createResourceFactory(fetchFn1);
					const resourceFactory2 = createResourceFactory(fetchFn2, {noSsr: true});

					function App() {
						const resource1 = resourceFactory1.use(1);
						const resource2 = resourceFactory2.use(2);
						return (
							<div>
								<Suspense fallback={<span>Loading</span>}>
									<Component resource={resource1} />
									<Component resource={resource2} />
								</Suspense>
							</div>
						);
					}

					function Component({resource}) {
						const data = resource.read();
						return <span>{data.msg}</span>;
					}

					extractor = new DataExtractor();
					html = await renderToStringAsync(extractor.collectData(<App />));
				});

				it('calls 1st fetch function only', async () => {
					expect(fetchFn1).toHaveBeenCalledTimes(1);
					expect(fetchFn2).not.toHaveBeenCalled();
				});

				it('calls `.abort()` on 1st fetch promise', async () => {
					expect(promise1.abort).toHaveBeenCalledTimes(1);
				});

				it('renders fallback HTML', async () => {
					expect(html).toBe('<div data-reactroot=""><span>Loading</span></div>');
				});

				it('extractor.getData() returns empty data cache as object', async () => {
					const cache = extractor.getData();
					expect(cache).toEqual({});
				});

				it('extractor.getScript() returns empty data cache as script', async () => {
					const scriptHtml = extractor.getScript();
					expect(scriptHtml).toBe('<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={}</script>');
				});
			});
		});
	});
});
