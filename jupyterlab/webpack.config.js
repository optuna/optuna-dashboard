module.exports = {
  ignoreWarnings: [
    (warning) =>
      typeof warning.message === "string" &&
      warning.message.includes("Failed to parse source map") ||
      warning.message.includes('Invalid dependencies have been reported'),
  ],
};