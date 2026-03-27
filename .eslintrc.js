module.exports = {
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
	],
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	env: {
		node: true,
		es6: true,
		jest: true,
	},
	rules: {
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'no-empty': ['error', { allowEmptyCatch: true }],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
	},
	ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
