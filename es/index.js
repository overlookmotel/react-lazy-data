/* --------------------
 * react-lazy-data module
 * ESM Entry point
 * Re-export in tree-shakable form, choosing dev or prod build based on NODE_ENV.
 * ------------------*/

// Imports
import {
	createResourceFactory as createResourceFactoryProd,
	isResource as isResourceProd,
	withResources as withResourcesProd
} from '../dist/esm/react-lazy-data.min.js';

import {
	createResourceFactory as createResourceFactoryDev,
	isResource as isResourceDev,
	withResources as withResourcesDev
} from '../dist/esm/react-lazy-data.js';

// Exports

export const createResourceFactory = process.env.NODE_ENV === 'production'
	? createResourceFactoryProd
	: createResourceFactoryDev;
export const isResource = process.env.NODE_ENV === 'production'
	? isResourceProd
	: isResourceDev;
export const withResources = process.env.NODE_ENV === 'production'
	? withResourcesProd
	: withResourcesDev;
