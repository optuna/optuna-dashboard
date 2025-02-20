module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
};
