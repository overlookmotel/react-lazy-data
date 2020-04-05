/* --------------------
 * react-lazy-data module
 * ESM server entry point
 * Re-export in tree-shakable form, choosing dev or prod build based on NODE_ENV.
 * ------------------*/

// Imports
import {
	DataExtractor as DataExtractorProd,
	DataExtractorManager as DataExtractorManagerProd
} from '../dist/esm/server.min.js';

import {
	DataExtractor as DataExtractorDev,
	DataExtractorManager as DataExtractorManagerDev
} from '../dist/esm/server.js';

// Exports

export const DataExtractor = process.env.NODE_ENV === 'production'
	? DataExtractorProd
	: DataExtractorDev;
export const DataExtractorManager = process.env.NODE_ENV === 'production'
	? DataExtractorManagerProd
	: DataExtractorManagerDev;
