module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ["jest-canvas-mock"],
  globals: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'APP_BAR_TITLE': JSON.stringify(process.env.APP_BAR_TITLE || "Optuna Dashboard"),
    'API_ENDPOINT': JSON.stringify(process.env.API_ENDPOINT),
    'URL_PREFIX': JSON.stringify(process.env.URL_PREFIX || "/dashboard")
  }
};