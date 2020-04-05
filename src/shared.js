/* --------------------
 * react-lazy-data module
 * Shared functions
 * ------------------*/

// Modules
import {isObject, isFullString} from 'is-it-type';
import invariant from 'tiny-invariant';

// Imports
import {DEFAULT_CACHE_VAR} from './constants.js';

// Constants
const EMPTY_OBJECT = {};

// Exports

export function getCacheVarFromOptionsWithValidate(options, defaultValue) {
	if (options == null) {
		options = EMPTY_OBJECT;
	} else {
		validateOptions(options);
	}

	return getCacheVarFromOptions(options, defaultValue);
}

export function validateOptions(options) {
	invariant(isObject(options), `options must be an object if provided - got ${options}`);
}

export function getCacheVarFromOptions(options, defaultValue) {
	const {cacheVar} = options;
	if (cacheVar == null) return defaultValue || DEFAULT_CACHE_VAR;

	invariant(
		isFullString(cacheVar),
		`options.cacheVar must be a non-empty string if provided - got ${cacheVar}`
	);

	return cacheVar;
}
