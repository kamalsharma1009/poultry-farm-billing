const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to stay within the project root.
  // This ensures Render preserves the downloaded browser binary between build and runtime.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
