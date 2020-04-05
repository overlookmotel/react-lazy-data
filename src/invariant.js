/* --------------------
 * react-lazy-data module
 * Invariant function
 * ------------------*/

// Modules
import invariant from 'tiny-invariant';

// Exports

// Invariant function with prefix
export default __DEV__
	? (condition, message) => invariant(condition, `react-lazy-data/babel: ${message}`)
	: invariant;
