module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react-hooks', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Disable base ESLint no-unused-vars rule in favor of TypeScript version
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': ['warn', { 
      ignoreRestArgs: true,
    }],
  },
  overrides: [
    {
      files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/test/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'react-refresh/only-export-components': 'off',
      },
    },
    {
      files: ['**/context/**', '**/hooks/**'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
}

