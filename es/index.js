/* --------------------
 * react-lazy-data module
 * ESM main entry point
 * Re-export in tree-shakable form, choosing dev or prod build based on NODE_ENV.
 * ------------------*/

// Imports
import {
	createResourceFactory as createResourceFactoryProd,
	isResource as isResourceProd,
	withResources as withResourcesProd
} from '../dist/esm/index.min.js';

import {
	createResourceFactory as createResourceFactoryDev,
	isResource as isResourceDev,
	withResources as withResourcesDev
} from '../dist/esm/index.js';

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
