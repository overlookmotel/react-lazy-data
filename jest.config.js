/* --------------------
 * react-lazy-data module
 * Jest config
 * ------------------*/

'use strict';

// Modules
const React = require('react');

// Exports

const testEnv = (process.env.TEST_ENV || '').toLowerCase(),
	isProd = process.env.NODE_ENV === 'production';

module.exports = {
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['src/**/*.js'],
	setupFilesAfterEnv: ['jest-extended', '@testing-library/jest-dom'],
	// Resolve `import from 'react-lazy-data'` to src or build, depending on env variable
	moduleNameMapper: {
		'^react-lazy-data$': resolvePath('index'),
		'^react-lazy-data/server(\\.js)?$': resolvePath('server'),
		'^react-lazy-data/babel(\\.js)?$': resolvePath('babel')
	},
	// Define __DEV__ (`babel-plugin-dev-expression` does not operate when NODE_ENV is test)
	globals: {__DEV__: true},
	// Transform ESM runtime helpers to CJS
	transformIgnorePatterns: ['<rootDir>/node_modules/(?!@babel/runtime/helpers/esm/)'],
	// Skip server tests for UMD build (which does not include server-side code)
	// and hydrate tests on React 16.10.0 (hydration totally broken in that version)
	testPathIgnorePatterns: [
		'/node_modules/',
		...(testEnv === 'umd' ? ['/test/server.test.js', '/test/babel.test.js'] : []),
		...(React.version === '16.10.0' ? ['/test/hydrate.test.js'] : [])
	]
};

function resolvePath(fileName) {
	if (!testEnv) return `<rootDir>/src/${fileName === 'index' ? 'client' : 'server'}/${fileName}.js`;
	if (testEnv === 'cjs') return `<rootDir>/${fileName}.js`;
	if (testEnv === 'esm') return `<rootDir>/dist/esm/${fileName}${isProd ? '.min' : ''}.js`;
	if (testEnv === 'umd') return `<rootDir>/dist/umd/${fileName}${isProd ? '.min' : ''}.js`;

	throw new Error(
		`Invalid TEST_ENV '${testEnv}' - valid options are 'cjs', 'esm', 'umd' or undefined`
	);
}
