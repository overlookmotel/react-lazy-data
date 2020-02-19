/* --------------------
 * react-lazy-data module
 * Utils
 * ------------------*/

/* eslint-disable import/prefer-default-export */

// Exports

/**
 * Determine if input is a React class component.
 * Input must have already been checked that it's a function before calling this.
 * @param {Function} Component - Function
 * @return {boolean} - true if is a React class component
 */
export function isClassComponent(Component) {
	return !!(Component.prototype && Component.prototype.isReactComponent);
}
