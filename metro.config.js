// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for WebAssembly (.wasm) and ESM modules (.mjs)
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('mjs');

module.exports = config;
