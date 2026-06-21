// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // react-scripts 5.0.1 emits the deprecated `onBeforeSetupMiddleware` /
  // `onAfterSetupMiddleware` options, which webpack-dev-server v5 rejects.
  // Bridge them to the new `setupMiddlewares` API and drop the old keys.
  const onBefore = devServerConfig.onBeforeSetupMiddleware;
  const onAfter = devServerConfig.onAfterSetupMiddleware;
  delete devServerConfig.onBeforeSetupMiddleware;
  delete devServerConfig.onAfterSetupMiddleware;

  // Bridge deprecated `https` → `server` (webpack-dev-server v5)
  if (devServerConfig.https !== undefined) {
    if (devServerConfig.https && typeof devServerConfig.https === "object") {
      devServerConfig.server = { type: "https", options: devServerConfig.https };
    } else {
      devServerConfig.server = devServerConfig.https ? "https" : "http";
    }
    delete devServerConfig.https;
  }

  // Drop other v4-only keys not accepted by v5 schema
  ["sockHost", "sockPath", "sockPort", "public", "publicPath", "inline", "lazy", "filename", "stats", "quiet", "noInfo", "before", "after", "clientLogLevel", "contentBase", "contentBasePublicPath", "watchContentBase", "watchOptions", "disableHostCheck"].forEach((k) => {
    if (k in devServerConfig) delete devServerConfig[k];
  });

  const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
  devServerConfig.setupMiddlewares = (middlewares, devServer) => {
    if (onBefore) onBefore(devServer);
    if (originalSetupMiddlewares) middlewares = originalSetupMiddlewares(middlewares, devServer);
    if (onAfter) onAfter(devServer);
    if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
      setupHealthEndpoints(devServer, healthPluginInstance);
    }
    return middlewares;
  };

  // Allow the preview host(s) explicitly to avoid "Invalid Host header"
  devServerConfig.allowedHosts = "all";

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;
