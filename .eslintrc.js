module.exports = {
  root: true,
  parser: "babel-eslint",
  extends: ["airbnb"],
  parserOptions: {
    ecmaVersion: 6,
    ecmaFeatures: {
      jsx: false,
      browser: true,
      commonjs: true,
      jquery: true,
      node: true,
      es6: true,
      worker: true,
      webextensions: true,
      "shared-node-browser": true,
      nashorn: true
    }
  },
  rules: {
    code: "125",
    "no-undef": "off",
    "no-console": "off",
    "func-names": "off",
    "no-unused-vars": "off",
    "no-underscore-dangle": "off",
    "prefer-destructuring": "off",
    "class-methods-use-this": "off",
    "no-useless-constructor": "off",
    "import/prefer-default-export": "off",
    "import/no-extraneous-dependencies": "off"
  }
};
