/* --------------------
 * react-lazy-data module
 * Jest config
 * ------------------*/

'use strict';

module.exports = {
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	collectCoverageFrom: [
		'**/*.js',
		'!.**',
		'!**/.**',
		'!**/node_modules/**',
		'!test/**',
		'!jest.config.js'
	],
	setupFilesAfterEnv: ['jest-extended'],
	// Resolve `import from 'react-lazy-data'` to src or build, depending on env variable
	moduleNameMapper: {
		'^react-lazy-data$': resolvePath()
	}
};

function resolvePath() {
	const testEnv = process.env.TEST_ENV;
	if (testEnv === 'cjs') return '<rootDir>/index.js';
	if (testEnv === 'umd') return '<rootDir>/dist/umd/react-lazy-data.js';
	return '<rootDir>/src/index.js';
}
