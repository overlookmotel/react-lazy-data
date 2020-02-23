/* --------------------
 * react-lazy-data module
 * Tests for `withResources()`
 *
 * @jest-environment jsdom
 * ------------------*/

// Modules
// eslint-disable-next-line import/no-unresolved, node/no-missing-import
import {withResources, createResourceFactory} from 'react-lazy-data';
import React, {Suspense} from 'react';

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
		it('with 1 resource', async () => {
			const {promise, resolve} = defer();

			const factory = createResourceFactory(() => promise);

			const Component = spy(props => <div id="result">{props.a}</div>);
			const ComponentWithResources = withResources(Component);

			const App = () => {
				const resource = factory.create(123);
				return (
					<Suspense fallback="Loading">
						<ComponentWithResources a={resource} />
					</Suspense>
				);
			};

			const container = render(<App />);
			act();

			expect(Component).not.toBeCalled();

			await resolve('abc');

			expect(Component).toBeCalledTimes(1);
			expect(getFirstCallArg(Component)).toEqual({a: 'abc'});

			const resultDiv = container.querySelector('#result');
			expect(resultDiv).toBeInTheDocument();
			expect(resultDiv).toContainHTML('abc');
		});

		it('with 2 resources', async () => {
			const {promise: promise1, resolve: resolve1} = defer();
			const {promise: promise2, resolve: resolve2} = defer();

			const factory1 = createResourceFactory(() => promise1);
			const factory2 = createResourceFactory(() => promise2);

			const Component = spy(props => <div id="result">{props.a} {props.b}</div>);
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

			const container = render(<App />);
			act();

			expect(Component).not.toBeCalled();

			await resolve1('abc');
			await resolve2('def');

			expect(Component).toBeCalledTimes(1);
			expect(getFirstCallArg(Component)).toEqual({a: 'abc', b: 'def'});

			const resultDiv = container.querySelector('#result');
			expect(resultDiv).toBeInTheDocument();
			expect(resultDiv).toContainHTML('abc def');
		});
	});

	describe('passes through other props', () => {
		it('with no resources', () => {
			const Component = spy(props => <div id="result">{props.num} {props.str}</div>);
			const ComponentWithResources = withResources(Component);

			const App = () => (
				<ComponentWithResources num={789} str="xyz" />
			);

			const container = render(<App />);

			expect(Component).toBeCalledTimes(1);
			expect(getFirstCallArg(Component)).toEqual({num: 789, str: 'xyz'});

			const resultDiv = container.querySelector('#result');
			expect(resultDiv).toBeInTheDocument();
			expect(resultDiv).toContainHTML('789 xyz');
		});

		it('with resources', async () => {
			const {promise: promise1, resolve: resolve1} = defer();
			const {promise: promise2, resolve: resolve2} = defer();

			const factory1 = createResourceFactory(() => promise1);
			const factory2 = createResourceFactory(() => promise2);

			const Component = spy(props => (
				<div id="result">{props.a} {props.b} {props.num} {props.str}</div>
			));
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

			const container = render(<App />);
			act();

			expect(Component).not.toBeCalled();

			await resolve1('abc');
			await resolve2('def');

			expect(Component).toBeCalledTimes(1);
			expect(getFirstCallArg(Component)).toEqual({a: 'abc', b: 'def', num: 789, str: 'xyz'});

			const resultDiv = container.querySelector('#result');
			expect(resultDiv).toBeInTheDocument();
			expect(resultDiv).toContainHTML('abc def 789 xyz');
		});
	});
});
