/* --------------------
 * react-lazy-data module
 * `createResourceFactory()` function
 * ------------------*/

// Modules
import {useRef, useEffect, useContext} from 'react';
import {isFunction, isString, isFullString, isBoolean} from 'is-it-type';
import invariant from 'tiny-invariant';

// Imports
import Resource from './resource.js';
import ServerContext from '../shared/serverContext.js';
import {validateOptions, getCacheVarFromOptions} from '../shared/shared.js';

// Constants
const IS_NODE = typeof window === 'undefined';

// Exports

class ResourceFactory {
	constructor(fetchFn, options) {
		this._fetchFn = fetchFn;

		// Validate and conform options
		let id, serialize, noSsr, cacheVar;
		if (options != null) {
			validateOptions(options);

			({id, serialize, noSsr} = options);

			// Validate and conform `id` option
			if (id == null) {
				id = undefined;
			} else {
				invariant(
					isFullString(id),
					`options.id must be a non-empty string if provided - got ${id}`
				);

				// Using global cache implies serialization
				if (serialize == null) {
					serialize = true;
				} else {
					invariant(
						serialize !== false,
						'serialization cannot be disabled when using global cache'
					);
				}

				// Get cache var from options (use default cache var if not provided)
				cacheVar = getCacheVarFromOptions(options);
			}

			// Validate and conform `serialize` option
			if (serialize == null || serialize === false) {
				serialize = undefined;
			} else if (serialize === true) {
				serialize = JSON.stringify;
			} else {
				invariant(
					isFunction(serialize),
					`options.serialize must be a function or boolean if provided - got ${serialize}`
				);
				serialize = wrapSerializer(serialize);
			}

			invariant(
				!IS_NODE || !serialize || id,
				'If using caching on server side, must also provide options.id'
			);

			// Validate and conform `noSsr` option
			if (noSsr == null) {
				noSsr = false;
			} else {
				invariant(
					isBoolean(noSsr),
					`options.noSsr must be a boolean if provided - got ${noSsr}`
				);

				// No-SSR mode is only enabled on server side
				if (!IS_NODE) noSsr = false;
			}
		} else {
			noSsr = false;
		}

		this._id = id;
		this._serialize = serialize;
		this._noSsr = noSsr;
		this._cacheVar = cacheVar;

		// Init cache
		// Cache cannot be stored on factory in SSR as the factory is static across different
		// renders, so data would cross between renders. So it is stored in context instead
		// when rendering on server side.
		if (IS_NODE) {
			this._cache = undefined;
			this._needContext = !!serialize;
		} else {
			this._cache = serialize ? {} : undefined;
			this._needContext = false;
		}
	}

	create(req) {
		invariant(!this._needContext, '`.create` cannot be used on server side with caching enabled');
		return this._create(req);
	}

	_create(req, context) {
		const resource = this._getResource(req, undefined, context);

		// Load resource immediately
		// (unless in no-SSR mode, in which case leave it pending forever)
		if (!this._noSsr) resource._load();

		return resource;
	}

	use(req) {
		// If server-side render, load immediately with context
		if (IS_NODE) {
			const context = useContext(ServerContext);
			invariant(
				context || !this._needContext,
				'Application must be wrapped in a `DataExtractorManager` when using caching on server side'
			);
			return this._create(req, context);
		}

		// If no existing resource or req has changed, create one
		const resourceRef = useRef();

		let resource = resourceRef.current;
		if (!resource || req !== resource._req) {
			// TODO Add `if (resource) resource.dispose();` here to abort faster?
			resource = this._getResource(req, resource);
			resourceRef.current = resource;
		}

		// On mount, load data
		useEffect(() => {
			resource._load();

			// On unmount, dispose resource
			return () => resource.dispose();
		}, [resource]);

		// Return resource
		return resource;
	}

	_getResource(req, previousResource, context) {
		// If no cache, create new resource without caching
		const serialize = this._serialize;
		if (!serialize) return new Resource(this, req, undefined, context);

		// Serialize request
		const cacheKey = serialize(req);

		// If serialized request has not changed, return previous resource
		if (previousResource && previousResource._cacheKey === cacheKey) return previousResource;

		// Get existing resource from cache
		// Cache is either in factory or (on server side) in context
		const cache = context ? context.getCache(this) : this._cache;
		let masterResource = cache[cacheKey];

		// If not found in cache, create resource and add to cache
		if (!masterResource) {
			// Create new resource
			masterResource = new Resource(this, req, cacheKey);

			// Get data from global cache
			this._populateFromGlobalCache(masterResource, cacheKey);

			// Save resource to local cache
			cache[cacheKey] = masterResource;
		}

		// Return clone of master resource
		return masterResource._childWithContext(undefined, context);
	}

	_clearCacheEntry(cacheKey) {
		if (this._cache) delete this._cache[cacheKey];
	}

	/**
	 * Get data from global cache and resolve resource with it.
	 *
	 * The global cache is one shot - values are consumed from it, and then removed from
	 * the cache. So next time the same request is made, it will async fetch fresh data.
	 * Global cache is intended for SSR hyration. At the end of hydration, the cache should
	 * be empty.
	 *
	 * @param {Object} resource - Resource to populate with data if found in cache
	 * @param {string} cacheKey - Request cache key
	 * @returns {undefined}
	 */
	_populateFromGlobalCache(resource, cacheKey) {
		// Global cache only works on client-side
		if (IS_NODE) return;

		// If no factory ID, does not use global cache
		const id = this._id;
		if (!id) return;

		// Get global cache
		const globalCacheContainer = window[this._cacheVar];
		if (!globalCacheContainer) return;
		const globalCache = globalCacheContainer.data;
		if (!globalCache) return;

		// Get data cache for this factory
		const valuesCache = globalCache[id];
		if (!valuesCache) return;

		// Get data cached for this request
		// NB `.hasOwnProperty()` is safe here as we know the cache object is a plain JS object
		if (!valuesCache.hasOwnProperty(cacheKey)) return; // eslint-disable-line no-prototype-builtins
		const value = valuesCache[cacheKey];

		// Delete from global cache
		delete valuesCache[cacheKey];
		if (Object.keys(valuesCache).length === 0) delete globalCache[id];

		// Resolve resource with cached data
		resource._resolvedThis(value);
	}
}

export default function createResourceFactory(fetchFn, options) {
	return new ResourceFactory(fetchFn, options);
}

/*
 * Helper functions
 */
function wrapSerializer(serialize) {
	return (req) => {
		const cacheKey = serialize(req);
		invariant(isString(cacheKey), `serialize() must return a string - got ${cacheKey}`);
		return cacheKey;
	};
}
