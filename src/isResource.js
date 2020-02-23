/* --------------------
 * react-lazy-data module
 * `isResource()` function
 * ------------------*/

// Imports
import {IS_RESOURCE} from './constants.js';
import {isFunction} from './utils.js';

// Exports

export default function isResource(value) {
	return value != null && !!value[IS_RESOURCE] && isFunction(value.read);
}
