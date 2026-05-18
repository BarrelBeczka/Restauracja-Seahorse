const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    supportFile: false,
    setupNodeEvents(on, config) {
      // eventy
    },
  },
});
