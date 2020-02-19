/* --------------------
 * react-lazy-data module
 * `isResource()` function
 * ------------------*/

// Imports
import {IS_RESOURCE} from './constants.js';

// Exports

export default function isResource(value) {
	return value != null && !!value[IS_RESOURCE] && typeof value.read === 'function';
}
