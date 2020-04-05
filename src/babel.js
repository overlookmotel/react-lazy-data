/* --------------------
 * react-lazy-data module
 * `react-lazy-data/babel` entry point
 * Babel plugin
 * ------------------*/

// Modules
import {sep as pathSeparator} from 'path';
import {isFullString, isPositiveInteger, isBoolean} from 'is-it-type';

// Imports
import createId from './babelCreateId.js';
import invariant from './invariant.js';
import {DEFAULT_CACHE_VAR} from './constants.js';

// Exports

/**
 * Babel plugin.
 * Adds unique IDs to `createResourceFactory()` calls.
 *
 * Transforms `createResourceFactory( () => { ... } )`
 * to `createResourceFactory( () => { ... }, {id: 'PY7q4rSC'} )`.
 *
 * Also can add cache var option (if desired)
 * and remove uneccesary code where options provided are the default anyway.
 *
 * ID and cache var are not added if either `serialize: false` or `noSsr: true` option is provided.
 *
 * IDs are a hash of:
 *   1. name of package file is in
 *   2. path of file relative to package root
 *   3. counter - which increments for each call
 *
 * This should produce IDs which are unique within an application.
 *
 * @param {Object} api - Babel API
 * @param {Object} options - Options object
 * @param {string} [options.rootPath] - Root dir of package (optional)
 * @param {boolean} [isPackage=false] - `true` if is a package
 * @param {string} [options.packageName] - Package name (optional)
 * @param {string} [options.packageVersion] - Package version (optional)
 * @param {number} [options.idLength] - Length of IDs (optional)
 * @param {number} [options.cacheVar] - `cacheVar` option (optional)
 * @returns {Object} - Babel plugin
 */
export default function(api, options) {
	const {types} = api;

	// Validate and conform options
	options = {...options};
	for (const key in options) {
		if (options[key] === null) options[key] = undefined;
	}

	const {rootPath} = options;
	if (rootPath !== undefined) {
		invariant(
			isFullString(rootPath),
			`options.rootPath must be a non-empty string if provided - got ${rootPath}`
		);
		// Trim off trailing slash
		if (rootPath.length > 1 && rootPath.slice(-1) === pathSeparator) {
			options.rootPath = rootPath.slice(0, -1);
		}
	}

	const {isPackage} = options;
	if (isPackage === undefined) {
		options.isPackage = false;
	} else {
		invariant(
			isBoolean(isPackage),
			`options.isPackage must be a boolean if provided - got ${isPackage}`
		);
	}

	const {packageName} = options;
	invariant(
		packageName === undefined || isFullString(packageName),
		`options.packageName must be a non-empty string if provided - got ${packageName}`
	);

	const {packageVersion} = options;
	invariant(
		packageVersion === undefined || isFullString(packageVersion),
		`options.packageVersion must be a non-empty string if provided - got ${packageVersion}`
	);
	invariant(
		!packageName === !packageVersion,
		'packageName and packageVersion options must either be both provided or both omitted'
	);

	const {idLength} = options;
	invariant(
		idLength === undefined || isPositiveInteger(idLength),
		`options.idLength must be a positive integer if provided - got ${idLength}`
	);

	const {cacheVar} = options;
	invariant(
		cacheVar === undefined || isFullString(cacheVar),
		`options.cacheVar must be a non-empty string if provided - got ${cacheVar}`
	);
	// Disregard the default as it's unnecessary
	if (cacheVar === DEFAULT_CACHE_VAR) options.cacheVar = undefined;

	// Return plugin
	return {
		visitor: {
			CallExpression(path, state) {
				transform(path, state, options, types);
			}
		}
	};
}

/**
 * Babel transform visitor.
 * Tranforms `createResourceFactory()` function calls to add ID (and cache var if desired).
 * @param {Object} callPath - Babel path for function call
 * @param {Object} state - Babel state object
 * @param {Object} options - User-defined options
 * @param {Object} t - Babel types object
 * @returns {undefined}
 */
function transform(callPath, state, options, t) {
	// Check is a call to `createResourceFactory()`
	if (!callPath.get('callee').isIdentifier({name: 'createResourceFactory'})) return;

	// Read or create options object
	let optionsPath, cacheVar;
	if (callPath.node.arguments.length > 1) {
		// Read existing options
		optionsPath = callPath.get('arguments.1');
		const propsPaths = getObjectProps(optionsPath);
		const {id: idProp, serialize: serializeProp, noSsr: noSsrProp} = propsPaths;
		let cacheVarProp = propsPaths.cacheVar;

		// Validate options and remove default options
		let serialize = true,
			noSsr = false;
		invariant(
			!idProp || idProp.valuePath.isStringLiteral(),
			'`createResourceFactory()` `id` option must be a string literal if defined'
		);

		if (noSsrProp) {
			invariant(
				noSsrProp.valuePath.isBooleanLiteral(),
				'`createResourceFactory()` `noSsr` option must be a boolean literal if defined'
			);
			noSsr = noSsrProp.value;
			// Remove `noSsr: false` as it's the default
			if (!noSsr) noSsrProp.propPath.remove();
		}

		if (serializeProp) {
			const {valuePath} = serializeProp;
			if (valuePath.isBooleanLiteral()) {
				serialize = serializeProp.value;
				// Remove `serialize: true` as it's the default (unless no-SSR option enabled)
				if (serialize && !noSsr) serializeProp.propPath.remove();
			} else {
				invariant(
					valuePath.isFunctionExpression() || valuePath.isArrowFunctionExpression(),
					'`createResourceFactory()` `serialize` option must be a boolean or function literal'
				);
			}
		}

		if (cacheVarProp) {
			invariant(
				cacheVarProp.valuePath.isStringLiteral(),
				'`createResourceFactory()` `cacheVar` option must be a string literal if defined'
			);

			cacheVar = cacheVarProp.value;
			invariant(
				cacheVar !== '',
				'`createResourceFactory()` `cacheVar` option must not be empty string'
			);

			// Remove `cacheVar: <default>` as it's the default
			if (cacheVar === DEFAULT_CACHE_VAR) {
				cacheVarProp.propPath.remove();
				cacheVarProp = undefined;
			}
		}

		// If serialization or server-rendering disabled, remove ID and cache var props
		// and do not add ID to options
		if (!serialize || noSsr) {
			if (idProp) idProp.propPath.remove();
			if (cacheVarProp) cacheVarProp.propPath.remove();
			return;
		}

		// If `id` option is already defined, do not add ID to options
		if (idProp) return;
	} else {
		// Create options object
		const optionsNode = t.objectExpression([]);
		callPath.pushContainer('arguments', optionsNode);
		optionsPath = callPath.get('arguments.1');
	}

	// Add ID to options object
	const id = createId(state, options);
	addStringPropToObject(optionsPath, 'id', id, t);

	// Add cache var to options
	if (!cacheVar) {
		cacheVar = options.cacheVar;
		if (cacheVar) addStringPropToObject(optionsPath, 'cacheVar', cacheVar, t);
	}
}

/**
 * Get details of all an object literal's properties.
 * Returns an object keyed by prop keys, containing objects of form
 * `{propPath, valuePath, value}`
 *
 * @param {Object} objectPath - Babel path for object
 * @returns {Object} - Object containing prop paths keyed by prop names
 */
function getObjectProps(objectPath) {
	invariant(
		objectPath.isObjectExpression(),
		'`createResourceFactory()` options must be an object literal'
	);

	const propsPaths = {};
	for (let i = 0; i < objectPath.node.properties.length; i++) {
		const propPath = objectPath.get(`properties.${i}`);

		const keyPath = propPath.get('key');
		invariant(
			keyPath.isIdentifier(),
			'`createResourceFactory()` options must contain only identifiers as keys'
		);

		const valuePath = propPath.get('value'),
			{value} = valuePath.node;
		propsPaths[keyPath.node.name] = {propPath, valuePath, value};
	}

	return propsPaths;
}

/**
 * Add string property to object.
 * @param {Object} objectPath - Babel path for object
 * @param {string} key - Object key
 * @param {string} value - Object value
 * @param {Object} t - Babel types object
 * @returns {undefined}
 */
function addStringPropToObject(objectPath, key, value, t) {
	addPropToObject(objectPath, key, t.stringLiteral(value), t);
}

/**
 * Add property to object.
 * @param {Object} objectPath - Babel path for object
 * @param {string} key - Object key
 * @param {Object} valuePath - Babel path for value
 * @param {Object} t - Babel types object
 * @returns {undefined}
 */
function addPropToObject(objectPath, key, valuePath, t) {
	const propPath = t.objectProperty(t.identifier(key), valuePath);
	objectPath.pushContainer('properties', propPath);
}
