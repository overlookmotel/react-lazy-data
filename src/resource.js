/* --------------------
 * react-lazy-data module
 * Resource class
 * ------------------*/

// Modules
import isPromise from 'is-promise';
import invariant from 'tiny-invariant';

// Imports
import {IS_RESOURCE} from './constants.js';

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

// Exports

export default class Resource {
	constructor(parent, fetchFn, req) {
		this._parent = parent;
		this._fetchFn = fetchFn;
		this._req = req;

		this._status = parent ? LOADING : INACTIVE;
		this._readStatus = NONE_CALLED;
		this._abort = undefined;
		this._children = [];
		this._numUnabortedChildren = 0;

		// Create promise
		// TODO Make this a thenable which calls `.then()` callbacks synchronously
		// when `this._resolve()` called, to avoid an extra tick?
		const promise = new Promise((resolve) => {
			this._resolve = resolve;
		});

		promise.abort = this.dispose.bind(this);

		this._value = promise;
	}

	_load() {
		// Do not load if already aborted
		if (this._status === ABORTED) return;

		// Execute fetch function
		// TODO Catch synchronously thrown errors in `fetchFn()`
		const fetchFn = this._fetchFn;
		const promise = fetchFn(this._req);
		invariant(isPromise(promise), `Fetch function must return a promise - got ${promise}`);

		// Set loading status
		this._status = LOADING;

		// Record promise's abort handler if defined
		const {abort} = promise;
		if (typeof abort === 'function') this._abort = abort.bind(promise);

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
		try {
			child._resolved(this._value[prop]);
		} catch (err) {
			child._rejected(err);
		}
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
		if (![INACTIVE, LOADING].includes(this._status)) return;

		const parent = this._parent;
		if (parent) {
			parent._abortFromChild();
		} else {
			this._status = ABORTED;

			const abort = this._abort;
			if (abort) {
				this._abort = undefined;
				abort();
			}
		}
	}

	child(prop) {
		invariant(
			['string', 'number', 'symbol'].includes(typeof prop),
			`.child() must be passed a string, number or symbol - received ${prop}`
		);

		this._validateReadStatus(CHILD_CALLED);

		const child = new Resource(this);

		const status = this._status;
		if (status === LOADED) {
			this._resolveChild(child, prop);
		} else if (status === ERRORED) {
			child._rejected(this._value);
		}

		this._children.push({child, prop});
		this._numUnabortedChildren++;
		return child;
	}

	_abortFromChild() {
		this._numUnabortedChildren--;
		if (this._numUnabortedChildren === 0) this.dispose();
	}

	_validateReadStatus(newReadStatus) {
		const readStatus = this._readStatus;
		if (readStatus === NONE_CALLED) {
			this._readStatus = newReadStatus;
		} else if (readStatus !== newReadStatus) {
			invariant(false, 'Cannot call both .read() and .child() on a resource');
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
