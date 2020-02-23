/* --------------------
 * react-lazy-data module
 * `withResources()` function
 * ------------------*/

// Modules
import {createElement} from 'react';
import invariant from 'tiny-invariant';

// Imports
import isResource from './isResource.js';
import {isClassComponent, isFunction} from './utils.js';

// Exports

export default function withResources(Component) {
	invariant(
		isFunction(Component),
		`withResources() must be passed a React component - got ${Component}`
	);

	const ComponentWithResources = isClassComponent(Component)
		? wrapClassComponent(Component)
		: wrapFunctionComponent(Component);

	Object.assign(ComponentWithResources, Component);
	ComponentWithResources.displayName = `withResources(${Component.displayName || Component.name || ''})`;
	return ComponentWithResources;
}

function wrapFunctionComponent(Component) {
	return function(props, ...otherArgs) {
		props = processProps(props);
		return Component.call(this, props, ...otherArgs); // eslint-disable-line no-invalid-this
	};
}

function wrapClassComponent(Component) {
	return (props) => {
		props = processProps(props);
		return createElement(Component, props);
	};
}

function processProps(props) {
	props = {...props};

	for (const key in props) {
		const value = props[key];
		if (isResource(value)) props[key] = value.read();
	}

	return props;
}
