/* --------------------
 * react-lazy-data module
 * `createResourceFactory()` function
 * ------------------*/

// Modules
import {useRef, useEffect} from 'react';
import {isObject, isFunction, isString} from 'is-it-type';
import invariant from 'tiny-invariant';

// Imports
import Resource from './resource.js';

// Constants
const IS_NODE = typeof window === 'undefined';

// Exports

class ResourceFactory {
	constructor(fetchFn, options) {
		this._fetchFn = fetchFn;

		// Validate and conform serialize option
		let serialize;
		if (options != null) {
			invariant(isObject(options), 'options must be an object if provided');

			serialize = options.serialize;
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
		}
		this._serialize = serialize;

		// Init cache
		this._cache = serialize ? {} : undefined;
	}

	create(req) {
		const resource = this._getResource(req);
		resource._load();
		return resource;
	}

	use(req) {
		// If server-side render, load immediately.
		// NB This does not violate the rules of hooks, as `IS_NODE` is a constant.
		if (IS_NODE) return this.create(req);

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

	_getResource(req, previousResource) {
		// If no cache, create new resource without caching
		const cache = this._cache;
		if (!cache) return new Resource(this, req);

		// Serialize request
		const cacheKey = this._serialize(req);

		// If serialized request has not changed, return previous resource
		if (previousResource && previousResource._cacheKey === cacheKey) return previousResource;

		// Get existing resource from cache
		let masterResource = cache[cacheKey];

		// If not found in cache, create resource and add to cache
		if (!masterResource) {
			masterResource = new Resource(this, req, cacheKey);
			cache[cacheKey] = masterResource;
		}

		// Return clone of master resource
		return masterResource.clone();
	}

	_clearCacheEntry(cacheKey) {
		delete this._cache[cacheKey];
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
