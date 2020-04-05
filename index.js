/* --------------------
 * react-lazy-data module
 * CJS entry point
 * Export dev or prod build based on NODE_ENV.
 * ------------------*/

/* eslint-disable global-require */

'use strict';

// Exports

if (process.env.NODE_ENV === 'production') {
	module.exports = require('./dist/cjs/react-lazy-data.min.js');
} else {
	module.exports = require('./dist/cjs/react-lazy-data.js');
}
