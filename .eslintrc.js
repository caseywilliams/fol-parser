module.exports = {
  "extends": "eslint:recommended",
  "env": {
    "commonjs": true,
    "es6": true,
    "node": true,
    "jest": true,
  },
  "globals": {
    "Atomics": "readonly",
    "SharedArrayBuffer": "readonly",
  },
  "parserOptions": {
    "ecmaVersion": 11,
  },
  "rules": {
    "comma-dangle": ["error", "always-multiline"],
    "eqeqeq": ["error", "always"],
    "guard-for-in": "error",
    "no-template-curly-in-string": "error",
    "require-atomic-updates": "error",
  },
};
