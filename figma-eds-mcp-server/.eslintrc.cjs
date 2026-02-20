module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'class-methods-use-this': 'off', // Allow utility methods in classes
    'no-console': 'off', // Allow console in development
    '@typescript-eslint/no-unused-vars': 'off', // Warn about unused variables
    'max-len': ['error', { code: 240 }], // Slightly longer lines for readability
    '@typescript-eslint/no-explicit-any': 'warn', // Warn about any usage
  },
};