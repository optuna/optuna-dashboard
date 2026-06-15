const path = require("path");

module.exports = {
    resolve: {
        alias: {
            react: path.resolve(__dirname, "node_modules/react"),
            "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        },
    },
    ignoreWarnings: [
        (warning) =>
        typeof warning.message === "string" &&
        (
            warning.message.includes("Failed to parse source map") ||
            warning.message.includes("Invalid dependencies have been reported")
        ),
    ],
};
