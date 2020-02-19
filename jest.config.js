/* --------------------
 * react-lazy-data module
 * Jest config
 * ------------------*/

'use strict';

// Exports

module.exports = {
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['src/**/*.js'],
	setupFilesAfterEnv: ['jest-extended', '@testing-library/jest-dom'],
	// Resolve `import from 'react-lazy-data'` to src or build, depending on env variable
	moduleNameMapper: {
		'^react-lazy-data$': resolvePath()
	}
};

function resolvePath() {
	const testEnv = (process.env.TEST_ENV || '').toLowerCase(),
		isProd = process.env.NODE_ENV === 'production';

	if (!testEnv) return '<rootDir>/src/index.js';
	if (testEnv === 'cjs') return '<rootDir>/index.js';
	if (testEnv === 'umd') return `<rootDir>/dist/umd/react-lazy-data${isProd ? '.min' : ''}.js`;

	throw new Error(`Invalid TEST_ENV '${testEnv}' - valid options are 'cjs', 'umd' or undefined`);
}
