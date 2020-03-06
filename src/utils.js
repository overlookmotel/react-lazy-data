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
export function isClassComponent(Component) {
	return !!(Component.prototype && Component.prototype.isReactComponent);
}

/**
 * Determine if input is function.
 * @param {*} input - Input
 * @returns {boolean} - true if is a function
 */
export function isFunction(input) {
	return isType(input, 'function');
}

/**
 * Determine if input is object.
 * @param {*} input - Input
 * @returns {boolean} - true if is a function
 */
export function isObject(input) {
	return !!input && isType(input, 'object');
}

/**
 * Determine if input is string.
 * @param {*} input - Input
 * @returns {boolean} - true if is a string
 */
export function isString(input) {
	return isType(input, 'string');
}

/**
 * Determine if input is a certain type.
 * @param {*} input - Input
 * @param {string} type - Type
 * @returns {boolean} - true if is that type
 */
export function isType(input, type) {
	return typeof input === type; // eslint-disable-line valid-typeof
}
