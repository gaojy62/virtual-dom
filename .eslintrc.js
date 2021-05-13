module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', "prettier"],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  env: {
    browser: true,
    node: false,
  },
  overrides: [
    {
      files: ['*.js'],
      extends: ["plugin:node/recommended"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      }
    },
  ],
  rules: {
    'no-unused-vars': [
      'error',
      // we are only using this rule to check for unused arguments since TS
      // catches unused variables but not args.
      { varsIgnorePattern: '.*', args: 'none' },
    ],
  },
}
