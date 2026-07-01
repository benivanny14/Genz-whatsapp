export default [
  {
    files: ["**/*.jsx", "**/*.js"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        sourceType: "module"
      }
    },
    rules: {
      "no-use-before-define": "error"
    }
  }
];
