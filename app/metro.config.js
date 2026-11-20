const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// expo-router pulls in expo-symbols, and with it ~6 MB of MaterialSymbols fonts
// in 7 weights that only SymbolView/NativeTabs use, which this app does not
// (expo/expo#43614). That package resolves to a stub so Metro does not bundle
// the fonts. If NativeTabs is ever used, remove this.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-sqlite') return { type: 'sourceFile', filePath: path.resolve(__dirname, 'src/web/sqlite.ts') };
  if (platform === 'web' && moduleName === 'expo-file-system/legacy') return { type: 'sourceFile', filePath: path.resolve(__dirname, 'src/web/filesystem.ts') };
  if (moduleName.startsWith('@expo-google-fonts/material-symbols')) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/stubs/material-symbols.js'),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

config.resolver.assetExts.push('wasm');
module.exports = config;
