/* --------------------
 * react-lazy-data module
 * `react-lazy-data/babel` entry point
 * Babel plugin
 * ------------------*/

// Modules
import createId from 'babel-unique-id';
import {pick} from 'lodash';
import {isFullString} from 'is-it-type';
import tinyInvariant from 'tiny-invariant';

// Imports
import {DEFAULT_CACHE_VAR} from './constants.js';

// Constants
const PLUGIN_NAME = 'react-lazy-data/babel';

// Exports

// Invariant function with prefix
const invariant = __DEV__
	? (condition, message) => tinyInvariant(condition, `${PLUGIN_NAME}: ${message}`)
	: tinyInvariant;

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
 * @param {string} [options.cacheVar] - `cacheVar` option (optional)
 * @returns {Object} - Babel plugin
 */
export default function(api, options) {
	// Validate and conform options
	// NB `babel-unique-id` validates the other options
	let {cacheVar} = options;
	invariant(
		cacheVar === undefined || isFullString(cacheVar),
		`options.cacheVar must be a non-empty string if provided - got ${cacheVar}`
	);
	// Disregard the default as it's unnecessary
	if (cacheVar === DEFAULT_CACHE_VAR) cacheVar = undefined;

	// ID options
	const idOptions = pick(
		options, ['rootPath', 'isPackage', 'packageName', 'packageVersion', 'idLength']
	);
	if (__DEV__) idOptions.pluginName = PLUGIN_NAME;

	// Return plugin
	return {
		visitor: {
			CallExpression(path, state) {
				transform(path, state, idOptions, cacheVar, api.types);
			}
		}
	};
}

/**
 * Babel transform visitor.
 * Tranforms `createResourceFactory()` function calls to add ID (and cache var if desired).
 * @param {Object} callPath - Babel path for function call
 * @param {Object} state - Babel state object
 * @param {Object} idOptions - Options to pass to `babel-unique-id`
 * @param {string} [cacheVarDefault] - `cacheVar` option (optional)
 * @param {Object} t - Babel types object
 * @returns {undefined}
 */
function transform(callPath, state, idOptions, cacheVarDefault, t) {
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
	const id = createId(state, idOptions);
	addStringPropToObject(optionsPath, 'id', id, t);

	// Add cache var to options
	if (!cacheVar) {
		cacheVar = cacheVarDefault;
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
