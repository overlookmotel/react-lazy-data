/* --------------------
 * react-lazy-data module
 * Tests ESLint config
 * ------------------*/

'use strict';

module.exports = {
	extends: [
		'@overlookmotel/eslint-config-node'
	],
	overrides: [{
		files: ['!.eslintrc.js'],
		extends: [
			'@overlookmotel/eslint-config-jest',
			'@overlookmotel/eslint-config-react'
		],
		rules: {
			'node/no-unsupported-features/es-syntax': ['error', {ignores: ['modules']}]
		}
	}]
};
