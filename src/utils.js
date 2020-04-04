/* --------------------
 * react-lazy-data module
 * Utils
 * ------------------*/

// Exports

/**
 * Determine if input is a React class component.
 * Input must have already been checked that it's a function before calling this.
 * @param {Function} Component - Function
 * @return {boolean} - true if is a React class component
 */
export function isClassComponent(Component) { // eslint-disable-line import/prefer-default-export
	return !!(Component.prototype && Component.prototype.isReactComponent);
}
