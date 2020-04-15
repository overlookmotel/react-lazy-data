/* --------------------
 * react-lazy-data module
 * Tests for client-side hydration of server-generated code
 *
 * @jest-environment jsdom
 * ------------------*/

/* eslint-disable jest/expect-expect */

// Modules
import React, {Suspense} from 'react';
import cheerio from 'cheerio';
import {createResourceFactory} from 'react-lazy-data';

// Imports
import {spy, hydrate, act, tick} from './support/utils.js';

// Init
import './support/index.js';

// Tests

// Record console.error output (i.e. hydration errors)
let consoleError, consoleErrorOriginal;
beforeEach(() => {
	consoleErrorOriginal = global.console.error;
	consoleError = spy();
	global.console.error = consoleError;
});

afterEach(() => {
	global.console.error = consoleErrorOriginal;
});

// Await promises, flush updates, and clear data cache after each test
afterEach(async () => {
	await tick();
	act();
	await tick();

	window['__react-lazy-data.DATA_CACHE'] = undefined;
});

// Test suites
describe('server-generated code hydrates on client', () => {
	describe('all rendered on server', () => {
		describe('one component', () => {
			let fetchFn, html, container;
			beforeEach(async () => {
				fetchFn = spy(id => Promise.resolve({msg: `Loaded ${id}`}));
				const Factory = createResourceFactory(fetchFn, {id: 'res'});

				function App() {
					const resource = Factory.use(1);
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

				html = '<div data-reactroot=""><span>Loaded 1</span></div>';
				const dataHtml = '<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res":{"1":{"msg":"Loaded 1"}}}</script>';

				container = await hydrate(<App />, html, dataHtml);
			});

			it('hydrates', () => {
				expectHtml(container, html);
			});

			it('does not produce hydration errors', () => {
				expect(consoleError).not.toHaveBeenCalled();
			});

			it('does not call fetch function', () => {
				act();
				expect(fetchFn).not.toHaveBeenCalled();
			});
		});

		describe('two components', () => {
			let fetchFn, html, container;
			beforeEach(async () => {
				fetchFn = spy(id => Promise.resolve({msg: `Loaded ${id}`}));
				const Factory = createResourceFactory(fetchFn, {id: 'res'});

				function App() {
					const resource1 = Factory.use(1);
					const resource2 = Factory.use(2);
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

				html = '<div data-reactroot=""><span>Loaded 1</span><span>Loaded 2</span></div>';
				const dataHtml = '<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res":{"1":{"msg":"Loaded 1"},"2":{"msg":"Loaded 2"}}}</script>';

				container = await hydrate(<App />, html, dataHtml);
			});

			it('hydrates', () => {
				expectHtml(container, html);
			});

			it('does not produce hydration errors', () => {
				expect(consoleError).not.toHaveBeenCalled();
			});

			it('does not call fetch function', () => {
				act();
				expect(fetchFn).not.toHaveBeenCalled();
			});
		});

		describe('two resource factories', () => {
			let fetchFn1, fetchFn2, html, container;
			beforeEach(async () => {
				fetchFn1 = spy(id => Promise.resolve({msg: `Loaded1 ${id}`}));
				fetchFn2 = spy(id => Promise.resolve({msg: `Loaded2 ${id}`}));
				const Factory1 = createResourceFactory(fetchFn1, {id: 'res1'});
				const Factory2 = createResourceFactory(fetchFn2, {id: 'res2'});

				function App() {
					const resource1 = Factory1.use(1);
					const resource2 = Factory2.use(2);
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

				html = '<div data-reactroot=""><span>Loaded1 1</span><span>Loaded2 2</span></div>';
				const dataHtml = '<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res1":{"1":{"msg":"Loaded1 1"}},"res2":{"2":{"msg":"Loaded2 2"}}}</script>';

				container = await hydrate(<App />, html, dataHtml);
			});

			it('hydrates', () => {
				expectHtml(container, html);
			});

			it('does not produce hydration errors', () => {
				expect(consoleError).not.toHaveBeenCalled();
			});

			it('does not call fetch functions', () => {
				act();
				expect(fetchFn1).not.toHaveBeenCalled();
				expect(fetchFn2).not.toHaveBeenCalled();
			});
		});
	});

	describe('with noSsr option', () => {
		describe('one component', () => {
			let fetchFn, html, container;
			beforeEach(async () => {
				fetchFn = spy(id => Promise.resolve({msg: `Loaded ${id}`}));
				const Factory = createResourceFactory(fetchFn, {noSsr: true});

				function App() {
					const resource = Factory.use(1);
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

				html = '<div data-reactroot=""><span>Loading</span></div>';
				const dataHtml = '<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={}</script>';

				container = await hydrate(<App />, html, dataHtml);
			});

			it('hydrates', () => {
				expectHtml(container, html);
			});

			it('does not produce hydration errors', () => {
				expect(consoleError).not.toHaveBeenCalled();
			});

			it('does not call fetch function during hydration', () => {
				expect(fetchFn).not.toHaveBeenCalled();
			});

			it('calls fetch function after hydration', async () => {
				act();
				expect(fetchFn).toHaveBeenCalledTimes(1);
				expect(fetchFn).toHaveBeenCalledWith(1);
			});

			it('renders with data after loading', async () => {
				act();
				await tick();
				const htmlAfter = '<div data-reactroot=""><span>Loaded 1</span></div>';
				expectHtml(container, htmlAfter);
			});
		});

		describe('two components', () => {
			let fetchFn, html, container;
			beforeEach(async () => {
				fetchFn = spy(id => Promise.resolve({msg: `Loaded ${id}`}));
				const Factory = createResourceFactory(fetchFn, {noSsr: true});

				function App() {
					const resource1 = Factory.use(1);
					const resource2 = Factory.use(2);
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

				html = '<div data-reactroot=""><span>Loading</span></div>';
				const dataHtml = '<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={}</script>';

				container = await hydrate(<App />, html, dataHtml);
			});

			it('hydrates', () => {
				expectHtml(container, html);
			});

			it('does not produce hydration errors', () => {
				expect(consoleError).not.toHaveBeenCalled();
			});

			it('does not call fetch function during hydration', () => {
				expect(fetchFn).not.toHaveBeenCalled();
			});

			it('calls fetch function after hydration', () => {
				act();
				expect(fetchFn).toHaveBeenCalledTimes(2);
				expect(fetchFn).toHaveBeenCalledWith(1);
				expect(fetchFn).toHaveBeenCalledWith(2);
			});

			it('renders with data after loading', async () => {
				act();
				await tick();
				const htmlAfter = '<div data-reactroot=""><span>Loaded 1</span><span>Loaded 2</span></div>';
				expectHtml(container, htmlAfter);
			});
		});

		describe('two resource factories', () => {
			describe('both `noSsr: true`', () => {
				let fetchFn1, fetchFn2, html, container;
				beforeEach(async () => {
					fetchFn1 = spy(id => Promise.resolve({msg: `Loaded1 ${id}`}));
					fetchFn2 = spy(id => Promise.resolve({msg: `Loaded2 ${id}`}));
					const Factory1 = createResourceFactory(fetchFn1, {noSsr: true});
					const Factory2 = createResourceFactory(fetchFn2, {noSsr: true});

					function App() {
						const resource1 = Factory1.use(1);
						const resource2 = Factory2.use(2);
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

					html = '<div data-reactroot=""><span>Loading</span></div>';
					const dataHtml = '<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={}</script>';

					container = await hydrate(<App />, html, dataHtml);
				});

				it('hydrates', () => {
					expectHtml(container, html);
				});

				it('does not produce hydration errors', () => {
					expect(consoleError).not.toHaveBeenCalled();
				});

				it('does not call fetch functions during hydration', () => {
					expect(fetchFn1).not.toHaveBeenCalled();
					expect(fetchFn2).not.toHaveBeenCalled();
				});

				it('calls fetch function after hydration', () => {
					act();
					expect(fetchFn1).toHaveBeenCalledTimes(1);
					expect(fetchFn1).toHaveBeenCalledWith(1);
					expect(fetchFn2).toHaveBeenCalledTimes(1);
					expect(fetchFn2).toHaveBeenCalledWith(2);
				});

				it('renders with data after loading', async () => {
					act();
					await tick();
					const htmlAfter = '<div data-reactroot=""><span>Loaded1 1</span><span>Loaded2 2</span></div>';
					expectHtml(container, htmlAfter);
				});
			});

			describe('first `noSsr: true`', () => {
				let fetchFn1, fetchFn2, html, container;
				beforeEach(async () => {
					fetchFn1 = spy(id => Promise.resolve({msg: `Loaded1 ${id}`}));
					fetchFn2 = spy(id => Promise.resolve({msg: `Loaded2 ${id}`}));
					const Factory1 = createResourceFactory(fetchFn1, {noSsr: true});
					const Factory2 = createResourceFactory(fetchFn2, {id: 'res2'});

					function App() {
						const resource1 = Factory1.use(1);
						const resource2 = Factory2.use(2);
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

					html = '<div data-reactroot=""><span>Loading</span></div>';
					const dataHtml = '<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res2":{"2":{msg:"Loaded2 2"}}}</script>';

					container = await hydrate(<App />, html, dataHtml);
				});

				it('hydrates', () => {
					expectHtml(container, html);
				});

				// Does produce hyration errors.
				// https://github.com/overlookmotel/react-async-ssr/issues/65
				// TODO Enable this test once workaround is found.
				// eslint-disable-next-line jest/no-disabled-tests
				it.skip('does not produce hydration errors', () => {
					expect(consoleError).not.toHaveBeenCalled();
				});

				it('does not call fetch functions during hydration', () => {
					expect(fetchFn1).not.toHaveBeenCalled();
					expect(fetchFn2).not.toHaveBeenCalled();
				});

				it('calls 1st fetch function after hydration', () => {
					act();
					expect(fetchFn1).toHaveBeenCalledTimes(1);
					expect(fetchFn1).toHaveBeenCalledWith(1);
					expect(fetchFn2).not.toHaveBeenCalled();
				});

				it('renders with data after loading', async () => {
					act();
					await tick();
					const htmlAfter = '<div data-reactroot=""><span>Loaded1 1</span><span>Loaded2 2</span></div>';
					expectHtml(container, htmlAfter);
				});
			});

			describe('2nd `noSsr: true`', () => {
				let fetchFn1, fetchFn2, html, container;
				beforeEach(async () => {
					fetchFn1 = spy(id => Promise.resolve({msg: `Loaded1 ${id}`}));
					fetchFn2 = spy(id => Promise.resolve({msg: `Loaded2 ${id}`}));
					const Factory1 = createResourceFactory(fetchFn1, {id: 'res1'});
					const Factory2 = createResourceFactory(fetchFn2, {noSsr: true});

					function App() {
						const resource1 = Factory1.use(1);
						const resource2 = Factory2.use(2);
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

					html = '<div data-reactroot=""><span>Loading</span></div>';
					const dataHtml = '<script>(window["__react-lazy-data.DATA_CACHE"]=window["__react-lazy-data.DATA_CACHE"]||{}).data={"res1":{"1":{msg:"Loaded1 1"}}}</script>';

					container = await hydrate(<App />, html, dataHtml);
				});

				it('hydrates', () => {
					expectHtml(container, html);
				});

				// Does produce hyration errors.
				// https://github.com/overlookmotel/react-async-ssr/issues/65
				// TODO Enable this test once workaround is found.
				// eslint-disable-next-line jest/no-disabled-tests
				it.skip('does not produce hydration errors', () => {
					expect(consoleError).not.toHaveBeenCalled();
				});

				it('does not call fetch functions during hydration', () => {
					expect(fetchFn1).not.toHaveBeenCalled();
					expect(fetchFn2).not.toHaveBeenCalled();
				});

				it('calls 1st fetch function after hydration', () => {
					act();
					expect(fetchFn1).not.toHaveBeenCalled();
					expect(fetchFn2).toHaveBeenCalledTimes(1);
					expect(fetchFn2).toHaveBeenCalledWith(2);
				});

				it('renders with data after loading', async () => {
					act();
					await tick();
					const htmlAfter = '<div data-reactroot=""><span>Loaded1 1</span><span>Loaded2 2</span></div>';
					expectHtml(container, htmlAfter);
				});
			});
		});
	});
});

/**
 * Expect client-side HTML to match expected.
 * @param {Object} container - DOM container
 * @param {string} expectedHtml - Expected HTML
 */
function expectHtml(container, expectedHtml) {
	expect(standardizeHtml(container.innerHTML)).toBe(standardizeHtml(expectedHtml));
}

/**
 * Standardize HTML - remove differences between server and client rendered HTML
 * which make no difference to render.
 * Remove:
 *   - `data-reactroot` + `data-reactroot=""` attributes
 *   - `style=""` attributes
 *   - `<!-- -->` blocks
 *
 * @param {string} html - Input HTML
 * @returns {string} - Standardized HTML
 */
function standardizeHtml(html) {
	return removeHiddenElements(html)
		.replace(/^(<[^ ]+) data-reactroot(?:="")?(?!=)/, (_, tag) => tag)
		.replace(/(<[^ ]+) style(?:="")?(?!=)/g, (_, tag) => tag)
		.replace(/<!-- -->/g, '');
}

/**
 * Remove elements from HTML with `style="display:none"`.
 * @param {string} html - HTML
 * @returns {string} - HTML with hidden elements removed
 */
function removeHiddenElements(html) {
	const $ = cheerio.load(`<div id="app">${html}</div>`);
	$('*').each((index, element) => {
		element = $(element);
		if (element.css('display') === 'none') element.remove();
	});
	return $('#app').html();
}
