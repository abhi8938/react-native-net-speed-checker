// your-library-name/example/metro.config.js

const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const pak = require(path.join(workspaceRoot, 'package.json'));
const packageName = pak.name;

const defaultConfig = getDefaultConfig(projectRoot);

/**
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],

  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    disableHierarchicalLookup: true,

    extraNodeModules: {
      [packageName]: workspaceRoot,
    },

    // ---- THIS IS THE MOST IMPORTANT PART ----
    // This tells Metro to look for the 'source' field in package.json
    // files first, which is what we need for local development.
    resolverMainFields: ['source', 'react-native', 'browser', 'main'],
  },

  // We need to make sure that the transformer is aware of the monorepo structure
  // and doesn't try to apply transforms to the same file multiple times.
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);