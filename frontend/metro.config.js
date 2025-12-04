const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// allow .md files as assets
config.resolver.assetExts.push("md");

module.exports = config;