/* --------------------
 * react-lazy-data module
 * Tests for `withResources()`
 *
 * @jest-environment jsdom
 * ------------------*/

// Modules
import React, {Suspense} from 'react';
import {withResources, createResourceFactory} from 'react-lazy-data';

// Imports
import {render, spy, getFirstCallArg, defer, act} from './support/utils.js';

// Init
import './support/index.js';

// Tests

// TODO Test works with class components

describe('withResources', () => {
	it('is a function', () => {
		expect(withResources).toBeFunction();
	});

	describe('reads resources before rendering component', () => {
		describe('with 1 resource', () => {
			let Component, resolve, container;
			beforeEach(async () => {
				const deferred = defer();
				const {promise} = deferred;
				resolve = deferred.resolve;

				const factory = createResourceFactory(() => promise);

				Component = spy(props => <div>{props.a}</div>);
				const ComponentWithResources = withResources(Component);

				const App = () => {
					const resource = factory.create(123);
					return (
						<Suspense fallback="Loading">
							<ComponentWithResources a={resource} />
						</Suspense>
					);
				};

				container = render(<App />);
				act();
			});

			describe('before resource resolves', () => {
				it('does not call component', () => {
					expect(Component).not.toHaveBeenCalled();
				});

				it('renders Suspense fallback', () => {
					expect(container).toContainHTML('Loading');
				});
			});

			describe('once resource resolved', () => {
				beforeEach(async () => {
					await resolve('abc');
				});

				it('calls component', () => {
					expect(Component).toHaveBeenCalledTimes(1);
					expect(getFirstCallArg(Component)).toEqual({a: 'abc'});
				});

				it('renders content', () => {
					expect(container).toContainHTML('abc');
				});
			});
		});

		describe('with 2 resources', () => {
			let Component, resolve1, resolve2, container;
			beforeEach(async () => {
				const deferred1 = defer();
				const promise1 = deferred1.promise;
				resolve1 = deferred1.resolve;

				const deferred2 = defer();
				const promise2 = deferred2.promise;
				resolve2 = deferred2.resolve;

				const factory1 = createResourceFactory(() => promise1);
				const factory2 = createResourceFactory(() => promise2);

				Component = spy(props => <div>{props.a} {props.b}</div>);
				const ComponentWithResources = withResources(Component);

				const App = () => {
					const resource1 = factory1.create(123);
					const resource2 = factory2.create(456);
					return (
						<Suspense fallback="Loading">
							<ComponentWithResources a={resource1} b={resource2} />
						</Suspense>
					);
				};

				container = render(<App />);
				act();
			});

			describe('before either resource resolves', () => {
				it('does not call component', () => {
					expect(Component).not.toHaveBeenCalled();
				});

				it('renders Suspense fallback', () => {
					expect(container).toContainHTML('Loading');
				});
			});

			describe('after 1st resource resolves', () => {
				beforeEach(async () => {
					await resolve1('abc');
				});

				it('does not call component', () => {
					expect(Component).not.toHaveBeenCalled();
				});

				it('renders Suspense fallback', () => {
					expect(container).toContainHTML('Loading');
				});
			});

			describe('after 2nd resource resolves', () => {
				beforeEach(async () => {
					await resolve2('def');
				});

				it('does not call component', () => {
					expect(Component).not.toHaveBeenCalled();
				});

				it('renders Suspense fallback', () => {
					expect(container).toContainHTML('Loading');
				});
			});

			describe('once both resources resolved', () => {
				beforeEach(async () => {
					await resolve1('abc');
					await resolve2('def');
				});

				it('calls component', () => {
					expect(Component).toHaveBeenCalledTimes(1);
					expect(getFirstCallArg(Component)).toEqual({a: 'abc', b: 'def'});
				});

				it('renders content', () => {
					expect(container).toContainHTML('abc def');
				});
			});
		});
	});

	describe('passes through other props', () => {
		describe('with no resources', () => {
			let Component, container;
			beforeEach(() => {
				Component = spy(props => <div>{props.num} {props.str}</div>);
				const ComponentWithResources = withResources(Component);

				const App = () => (
					<ComponentWithResources num={789} str="xyz" />
				);

				container = render(<App />);
			});

			it('calls component synchronously', () => {
				expect(Component).toHaveBeenCalledTimes(1);
				expect(getFirstCallArg(Component)).toEqual({num: 789, str: 'xyz'});
			});

			it('renders content', () => {
				expect(container).toContainHTML('789 xyz');
			});
		});

		describe('with resources', () => {
			let Component, resolve1, resolve2, container;
			beforeEach(() => {
				const deferred1 = defer();
				const promise1 = deferred1.promise;
				resolve1 = deferred1.resolve;

				const deferred2 = defer();
				const promise2 = deferred2.promise;
				resolve2 = deferred2.resolve;

				const factory1 = createResourceFactory(() => promise1);
				const factory2 = createResourceFactory(() => promise2);

				Component = spy(props => <div>{props.a} {props.b} {props.num} {props.str}</div>);
				const ComponentWithResources = withResources(Component);

				const App = () => {
					const resource1 = factory1.create(123);
					const resource2 = factory2.create(456);
					return (
						<Suspense fallback="Loading">
							<ComponentWithResources a={resource1} b={resource2} num={789} str="xyz" />
						</Suspense>
					);
				};

				container = render(<App />);
				act();
			});

			describe('before either resource resolves', () => {
				it('does not call component', () => {
					expect(Component).not.toHaveBeenCalled();
				});

				it('renders Suspense fallback', () => {
					expect(container).toContainHTML('Loading');
				});
			});

			describe('after 1st resource resolves', () => {
				beforeEach(async () => {
					await resolve1('abc');
				});

				it('does not call component', () => {
					expect(Component).not.toHaveBeenCalled();
				});

				it('renders Suspense fallback', () => {
					expect(container).toContainHTML('Loading');
				});
			});

			describe('after 2nd resource resolves', () => {
				beforeEach(async () => {
					await resolve2('def');
				});

				it('does not call component', () => {
					expect(Component).not.toHaveBeenCalled();
				});

				it('renders Suspense fallback', () => {
					expect(container).toContainHTML('Loading');
				});
			});

			describe('once both resources resolved', () => {
				beforeEach(async () => {
					await resolve1('abc');
					await resolve2('def');
				});

				it('calls component', () => {
					expect(Component).toHaveBeenCalledTimes(1);
					expect(getFirstCallArg(Component)).toEqual({
						a: 'abc', b: 'def', num: 789, str: 'xyz'
					});
				});

				it('renders content', () => {
					expect(container).toContainHTML('abc def 789 xyz');
				});
			});
		});
	});
});
