/* --------------------
 * react-lazy-data module
 * Resource class
 * ------------------*/

// Modules
import isPromise from 'is-promise';
import invariant from 'tiny-invariant';

// Imports
import {IS_RESOURCE} from './constants.js';
import {isFunction} from './utils.js';

// Constants
// Load status
const INACTIVE = 0,
	LOADING = 1,
	LOADED = 2,
	ERRORED = 3,
	ABORTED = 4;

// Read status
const NONE_CALLED = 0,
	READ_CALLED = 1,
	CHILD_CALLED = 2;

// Valid prop types
const PROP_TYPES = ['string', 'number', 'symbol'];

// Exports

export default class Resource {
	constructor(factory, req, cacheKey, parent) {
		this._factory = factory;
		this._req = req;
		this._cacheKey = cacheKey;
		this._parent = parent;

		this._status = parent ? LOADING : INACTIVE;
		this._readStatus = NONE_CALLED;
		this._isDisposed = false;
		this._abort = undefined;
		this._children = [];
		this._numUndisposedChildren = 0;

		// Create promise
		// Could make this a thenable which calls `.then()` callbacks synchronously
		// when `this._resolve()` called, to avoid an extra tick,
		// but I don't think it's worth the code bloat to save a microtick.
		const promise = new Promise((resolve) => {
			this._resolve = resolve;
		});

		promise.abort = this.dispose.bind(this);

		this._value = promise;
	}

	_load() {
		// Pass to parent if exists
		const parent = this._parent;
		if (parent) {
			parent._load();
			return;
		}

		// Do not load if already loading or aborted
		if (this._status !== INACTIVE) return;

		// Execute fetch function
		// TODO Catch synchronously thrown errors in `fetchFn()`
		const fetchFn = this._factory._fetchFn;
		const promise = fetchFn(this._req);
		invariant(isPromise(promise), `Fetch function must return a promise - got ${promise}`);

		// Set loading status
		this._status = LOADING;

		// Record promise's abort handler if defined
		const {abort} = promise;
		if (isFunction(abort)) this._abort = abort.bind(promise);

		// Update status when promise resolves
		promise.then(
			res => this._resolved(res),
			err => this._rejected(err)
		);
	}

	_resolved(value) {
		if (this._status !== LOADING) return;

		this._status = LOADED;
		this._value = value;
		this._abort = undefined;
		this._resolve();

		for (const {child, prop} of this._children) {
			this._resolveChild(child, prop);
		}
	}

	_resolveChild(child, prop) {
		let value = this._value;

		if (prop !== undefined) {
			try {
				value = value[prop];
			} catch (err) {
				child._rejected(err);
				return;
			}
		}

		child._resolved(value);
	}

	_rejected(err) {
		if (this._status !== LOADING) return;

		this._status = ERRORED;
		this._value = err;
		this._abort = undefined;
		this._resolve();

		for (const {child} of this._children) {
			child._rejected(err);
		}
	}

	read() {
		this._validateReadStatus(READ_CALLED);

		if (this._status === LOADED) return this._value;
		throw this._value;
	}

	dispose() {
		if (this._isDisposed) return;
		this._isDisposed = true;

		const parent = this._parent;
		if (parent) {
			parent._disposeFromChild();
		} else {
			if ([INACTIVE, LOADING].includes(this._status)) {
				this._status = ABORTED;

				const abort = this._abort;
				if (abort) {
					this._abort = undefined;
					abort();
				}
			}

			const cacheKey = this._cacheKey;
			if (cacheKey !== undefined) this._factory._clearCacheEntry(cacheKey);
		}
	}

	child(prop) {
		invariant(
			PROP_TYPES.includes(typeof prop),
			`.child() must be passed a string, number or symbol - received ${prop}`
		);

		return this._child(prop);
	}

	clone() {
		return this._child();
	}

	_child(prop) {
		this._validateReadStatus(CHILD_CALLED);

		const child = new Resource(undefined, this._req, this._cacheKey, this);

		const status = this._status;
		if (status === LOADED) {
			this._resolveChild(child, prop);
		} else if (status === ERRORED) {
			child._rejected(this._value);
		}

		this._children.push({child, prop});
		this._numUndisposedChildren++;
		return child;
	}

	_disposeFromChild() {
		this._numUndisposedChildren--;
		if (this._numUndisposedChildren === 0) this.dispose();
	}

	_validateReadStatus(newReadStatus) {
		const readStatus = this._readStatus;
		if (readStatus === NONE_CALLED) {
			this._readStatus = newReadStatus;
		} else if (readStatus !== newReadStatus) {
			invariant(false, 'Cannot call both .read() and .child() / .clone() on a resource');
		}
	}

	get isLoading() {
		return [INACTIVE, LOADING, ABORTED].includes(this._status);
	}

	get isLoaded() {
		return this._status === LOADED;
	}

	get isErrored() {
		return this._status === ERRORED;
	}
}

Resource.prototype[IS_RESOURCE] = true;
