module.exports = {
  extends: ["next", "plugin:prettier/recommended"],
  rules: {
    "react/react-in-jsx-scope": "off", // Not required for Next.js
    "no-console": "warn", // Warn instead of error for console logs
    "no-unused-vars": "warn", // Warn instead of error for unused variables
  },
};
