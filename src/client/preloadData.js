/* --------------------
 * react-lazy-data module
 * `preloadData()` function
 * ------------------*/

// Imports
import {getCacheVarFromOptionsWithValidate} from '../shared/shared.js';

// Exports

export default function preloadData(options) {
	return new Promise((resolve) => {
		// Get cache var from options
		// NB This is inside promise so function never synchronously throws
		const cacheVar = getCacheVarFromOptionsWithValidate(options);

		let cacheContainer = window[cacheVar];

		// If data already present, resolve
		if (cacheContainer) {
			resolve(cacheContainer.data);
			return;
		}

		// Set up trap to catch when data is written.
		// When it is, resolve promise.
		cacheContainer = Object.create(null, {
			data: {
				configurable: true,
				set(data) {
					Object.defineProperty(cacheContainer, 'data', {value: data});
					resolve(data);
				}
			}
		});

		window[cacheVar] = cacheContainer;
	});
}
