/* --------------------
 * react-lazy-data module
 * `createResourceFactory()` function
 * ------------------*/

// Modules
import {useRef, useEffect} from 'react';

// Imports
import Resource from './resource.js';

// Constants
const IS_NODE = typeof window === 'undefined';

// Exports

class ResourceFactory {
	constructor(fetchFn) {
		this._fetchFn = fetchFn;
	}

	create(req) {
		const resource = new Resource(undefined, this._fetchFn, req);
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
			resource = new Resource(undefined, this._fetchFn, req);
			resourceRef.current = resource;
		}

		// On mount, load data
		useEffect(() => {
			resource._load();

			// On unmount, abort resource
			return () => resource.dispose();
		}, [resource]);

		// Return resource
		return resource;
	}
}

export default function createResourceFactory(fetchFn) {
	return new ResourceFactory(fetchFn);
}
