/* --------------------
 * react-lazy-data module
 * ESLint config
 * ------------------*/

'use strict';

module.exports = {
	extends: [
		'@overlookmotel/eslint-config'
	],
	overrides: [
		{
			// JS files in root are NodeJS modules (entry point and config files)
			files: ['./*.js'],
			extends: [
				'@overlookmotel/eslint-config-node'
			]
		},
		{
			// index.js references files in dist folder which only exist after build
			files: ['./index.js'],
			rules: {
				'node/no-missing-require': 'off',
				'import/no-unresolved': 'off'
			}
		}
	]
};
