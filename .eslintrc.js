/* --------------------
 * react-lazy-data module
 * ESLint config
 * ------------------*/

'use strict';

// Exports

module.exports = {
	extends: [
		'@overlookmotel/eslint-config'
	],
	overrides: [
		// JS files in root are NodeJS modules (entry point and config files)
		{
			files: ['./*.js'],
			extends: [
				'@overlookmotel/eslint-config-node'
			]
		},
		// Entry points reference files in dist folder which only exist after build
		{
			files: ['./index.js', './server.js', './babel.js'],
			rules: {
				'node/no-missing-require': 'off',
				'import/no-unresolved': 'off'
			}
		},
		{
			files: ['./es/index.js', './es/server.js', './es/babel.js'],
			parserOptions: {
				sourceType: 'module'
			},
			rules: {
				'node/no-unsupported-features/es-syntax': ['error', {ignores: ['modules']}],
				'node/no-missing-import': 'off',
				'node/no-unpublished-import': 'off',
				'import/no-unresolved': 'off'
			}
		}
	]
};
