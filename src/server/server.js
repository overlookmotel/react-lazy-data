/* --------------------
 * react-lazy-data module
 * `react-lazy-data/server` entry point
 * Server-side functions
 * ------------------*/

// Modules
import {createElement} from 'react';

// Imports
import {getCacheVarFromOptionsWithValidate} from '../shared/shared.js';
import ServerContext from '../shared/serverContext.js';

// Exports

export class DataExtractor {
	constructor(options) {
		// Get cache var from options
		this._cacheVar = getCacheVarFromOptionsWithValidate(options);

		// Init data cache
		this._cache = {};
	}

	collectData(children) {
		return DataExtractorManager({extractor: this, children});
	}

	getData() {
		return this._cache;
	}

	getScript(options) {
		// Get cache var from options, or constructor options
		const cacheVar = getCacheVarFromOptionsWithValidate(options, this._cacheVar);

		// Get data
		const data = this.getData();

		// Return script tag containing data
		const cacheVarStr = jsonify(cacheVar);
		return `<script>(window[${cacheVarStr}]=window[${cacheVarStr}]||{}).data=${jsonify(data)}</script>`;
	}
}

class Ctx {
	constructor(extractor) {
		this._cache = {};
		this._ssrCache = extractor._cache;
	}

	getCache(factory) {
		// Get factory ID
		const id = factory._id;
		if (!id) return undefined;

		return getValuesCache(this._cache, id);
	}

	register(resource, willRender) {
		// If will not render, exit - data is not needed
		if (!willRender) return;

		// Get factory ID
		const id = resource._factory._id;
		if (!id) return;

		// Get master resource
		while (true) { // eslint-disable-line no-constant-condition
			const parent = resource._parent;
			if (!parent) break;
			resource = parent;
		}

		// Save data from resource to cache
		const valuesCache = getValuesCache(this._ssrCache, id);
		valuesCache[resource._cacheKey] = resource._value;
	}
}

export function DataExtractorManager({extractor, children}) {
	return createElement(
		ServerContext.Provider,
		{value: new Ctx(extractor), children}
	);
}

/*
 * Helper functions
 */
function getValuesCache(cache, id) {
	let valuesCache = cache[id];
	if (!valuesCache) {
		valuesCache = {};
		cache[id] = valuesCache;
	}
	return valuesCache;
}

/**
 * Convert to JSON for inclusion in HTML.
 * Like `JSON.stringify()` except escapes '</' to avoid XSS vulnerability
 * if data contains e.g. `</script><script>evil()</script>`.
 * https://sophiebits.com/2012/08/03/preventing-xss-json.html
 * @param {*} input - Input (any type)
 * @returns {string} - JSON string
 */
function jsonify(input) {
	return JSON.stringify(input).replace(/<\//g, '<\\/');
}
