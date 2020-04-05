/* --------------------
 * react-lazy-data module
 * Function to create IDs for Babel plugin
 * ------------------*/

// Modules
import fs from 'fs';
import {join as pathJoin, dirname, relative as pathRelative, sep as pathSeparator} from 'path';
import {createHash} from 'crypto';
import {isString} from 'is-it-type';

// Imports
import invariant from './invariant.js';

// Constants
const DEFAULT_HASH_LEN = 8;

const COUNTER = Symbol('react-lazy-data.COUNTER'),
	ID_STRING = Symbol('react-lazy-data.ID_STRING');

// Exports

/**
 * Create unique ID.
 *
 * ID is made up from:
 *   1. name of package file is in
 *   2. path of file relative to package root
 *   3. counter - which increments for each call
 *
 * These elements are concatenated and hashed, using a shortened SHA256 hash.
 * IDs are guaranteed to be legal JS identifiers.
 *
 * If no file path, or root of package can be found, the code of the file is used instead of
 * package name and relative path.
 *
 * @param {Object} state - Babel state object
 * @param {Object} [options] - Options object
 * @param {string} [options.rootPath] - Package root provided by user (optional)
 * @param {boolean} options.isPackage - `true` if is a package
 * @param {string} [options.packageName] - Package name provided by user (optional)
 * @param {string} [options.packageVersion] - Package name provided by user (optional)
 * @param {number} [options.idLength] - Length of IDs
 * @returns {string} - ID
 */
export default function(state, options) {
	// Conform options
	if (!options) options = {};
	if (!options.idLength) options = {...options, idLength: DEFAULT_HASH_LEN};

	// Get cached ID string
	const {file} = state;
	let idStr = file.get(ID_STRING);

	// If not cached, calculate ID string from path
	// (or if no path, or no package root found, use hash of file's code instead)
	if (!idStr) {
		const path = file.opts.filename;
		if (path) idStr = getIdStrFromPath(path, options);
		if (!idStr) idStr = `code:${sha256Hash(file.code)}`;

		file.set(ID_STRING, idStr);
	}

	// Add counter to ID string
	const count = file.get(COUNTER) || 0;
	file.set(COUNTER, count + 1);
	if (count) idStr += `\n${count}`;

	// Return hash of ID string
	return shortHash(idStr, options.idLength);
}

/**
 * Get ID string from path.
 * @param {string} path - File path
 * @param {Object} options - Options object
 * @param {boolean} options.isPackage - `true` if is a package
 * @param {string} [options.rootPath] - Package root provided by user (optional)
 * @param {string} [options.packageName] - Package name provided by user (optional)
 * @param {string} [options.packageVersion] - Package name provided by user (optional)
 * @returns {string} - Path and package name
 */
function getIdStrFromPath(path, options) {
	// Find name and root path of package (or use options provided by user)
	const {isPackage} = options;
	let {rootPath, packageName, packageVersion} = options;
	if (!rootPath || (isPackage && !packageName)) {
		const packageProps = findPackageRoot(rootPath || path);
		if (!packageProps) return undefined;
		if (!rootPath) rootPath = packageProps.path;
		if (isPackage && !packageName) {
			packageName = packageProps.name;
			packageVersion = packageProps.version;
			invariant(packageVersion, `${rootPath} does not contain a version field`);
			invariant(isString(packageName), `${rootPath} contains non-string name field`);
			invariant(isString(packageVersion), `${rootPath} contains non-string version field`);
		}
	}

	// Get path relative to root
	let relativePath = pathRelative(rootPath, path);

	// Conform path to Posix-style so IDs will be same regardless of whether on Windows or Posix
	if (pathSeparator === '\\') relativePath = relativePath.replace(/\\/g, '/');

	// Return concatenation of package name/version and relative path
	return packageName
		? `package:${packageName}@${packageVersion}\n${relativePath}`
		: `path:${relativePath}`;
}

/**
 * Find first folder above file which contains a `package.json` file with `name` defined.
 * i.e. The root of the app/package.
 *
 * `package.json` files without `name` defined are ignored because `package.json` is also used
 * to tell Node whether files in folder are ESM modules using `{type: 'module'}`.
 * Those `package.json` files do not indicate the root of a package.
 *
 * Returns an object of form `{name, version, path}`.
 * If no package root can be found, returns undefined.
 *
 * @param {string} path - Path of current file
 * @returns {Object|undefined}
 * @returns {string|undefined} .name - Package name
 * @returns {string|undefined} .version - Package version
 * @returns {string} .path - Path of root of package
 */
function findPackageRoot(path) {
	let name, version;
	while (true) { // eslint-disable-line no-constant-condition
		const parentPath = dirname(path);

		// If reached root, return root path
		if (parentPath === path) return undefined;
		path = parentPath;

		try {
			const pkgStr = fs.readFileSync(pathJoin(path, 'package.json'), 'utf8');
			const pkgObj = JSON.parse(pkgStr);
			name = pkgObj.name;
			if (name) {
				version = pkgObj.version;
				break;
			}
		} catch (err) {
			if (err.code !== 'ENOENT') throw err;
		}
	}

	return {name, version, path};
}

/**
 * Create short hash string which can be used as a JS identifier.
 * SHA256 in base64 (using chars A-Z, a-z, 0-9, _, $), not starting with a digit,
 * and truncated to specified length.
 *
 * @param {string} str - String to hash
 * @param {number} len - Length of hash
 * @return {string} - Hash string
 */
function shortHash(str, len) {
	// Hash string
	const buffer = sha256Hash(str, true);

	// Lose a bit off first byte to avoid base64 string starting with digit
	buffer[0] &= 127; // eslint-disable-line no-bitwise

	// Convert to base64 string of desired length, replacing chars not legal in JS identifiers
	return buffer.toString('base64')
		.slice(0, len)
		.replace(/=+$/, '')
		.replace(/\+/g, '_')
		.replace(/\//g, '$');
}

/**
 * Calculate SHA256 hash of string.
 * @param {string} str - Input string
 * @param {boolean} [binary] - If true, returns buffer, otherwise base64 string
 * @returns {string|Buffer}
 */
function sha256Hash(str, binary) {
	return createHash('sha256').update(str).digest(binary ? undefined : 'base64');
}
