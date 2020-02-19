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
import {render, spy, awaitSpy, getFirstCallArg} from './support/utils.js';

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
			const factory = createResourceFactory(req => Promise.resolve(req * 2));

			const Component = awaitSpy(props => <div id="result">{props.num}</div>);
			const ComponentWithResources = withResources(Component);

			const App = () => {
				const numResource = factory.create(123);
				return (
					<Suspense fallback="Loading">
						<ComponentWithResources num={numResource} />
					</Suspense>
				);
			};

			const container = render(<App />);

			expect(Component).not.toBeCalled();

			await Component.calledOnce();

			expect(Component).toBeCalledTimes(1);
			expect(getFirstCallArg(Component)).toEqual({num: 246});

			const resultDiv = container.querySelector('#result');
			expect(resultDiv).toBeInTheDocument();
			expect(resultDiv).toContainHTML('246');
		});

		it('with 2 resources', async () => {
			const numFactory = createResourceFactory(req => Promise.resolve(req * 2));
			const strFactory = createResourceFactory(req => Promise.resolve(`x${req}x`));

			const Component = awaitSpy(props => <div id="result">{props.num} {props.str}</div>);
			const ComponentWithResources = withResources(Component);

			const App = () => {
				const numResource = numFactory.create(123);
				const strResource = strFactory.create('abc');
				return (
					<Suspense fallback="Loading">
						<ComponentWithResources num={numResource} str={strResource} />
					</Suspense>
				);
			};

			const container = render(<App />);

			expect(Component).not.toBeCalled();

			await Component.calledOnce();

			expect(Component).toBeCalledTimes(1);
			expect(getFirstCallArg(Component)).toEqual({num: 246, str: 'xabcx'});

			const resultDiv = container.querySelector('#result');
			expect(resultDiv).toBeInTheDocument();
			expect(resultDiv).toContainHTML('246 xabcx');
		});
	});

	describe('passes through other props', () => {
		it('with no resources', () => {
			const Component = spy(props => <div id="result">{props.num} {props.str}</div>);
			const ComponentWithResources = withResources(Component);

			const App = () => (
				<ComponentWithResources num={789} str="def" />
			);

			const container = render(<App />);

			expect(Component).toBeCalledTimes(1);
			expect(getFirstCallArg(Component)).toEqual({num: 789, str: 'def'});

			const resultDiv = container.querySelector('#result');
			expect(resultDiv).toBeInTheDocument();
			expect(resultDiv).toContainHTML('789 def');
		});

		it('with resources', async () => {
			const numFactory = createResourceFactory(req => Promise.resolve(req * 2));
			const strFactory = createResourceFactory(req => Promise.resolve(`x${req}x`));

			const Component = awaitSpy(props => (
				<div id="result">{props.num} {props.str} {props.num2} {props.str2}</div>
			));
			const ComponentWithResources = withResources(Component);

			const App = () => {
				const numResource = numFactory.create(123);
				const strResource = strFactory.create('abc');
				return (
					<Suspense fallback="Loading">
						<ComponentWithResources num={numResource} str={strResource} num2={789} str2="def" />
					</Suspense>
				);
			};

			const container = render(<App />);

			expect(Component).not.toBeCalled();

			await Component.calledOnce();

			expect(Component).toBeCalledTimes(1);
			expect(getFirstCallArg(Component)).toEqual({num: 246, str: 'xabcx', num2: 789, str2: 'def'});

			const resultDiv = container.querySelector('#result');
			expect(resultDiv).toBeInTheDocument();
			expect(resultDiv).toContainHTML('246 xabcx 789 def');
		});
	});
});
