/* --------------------
 * react-lazy-data module
 * `isResource()` function
 * ------------------*/

// Modules
import {isFunction} from 'is-it-type';

// Imports
import {IS_RESOURCE} from '../shared/constants.js';

// Exports

export default function isResource(value) {
	return value != null && !!value[IS_RESOURCE] && isFunction(value.read);
}
