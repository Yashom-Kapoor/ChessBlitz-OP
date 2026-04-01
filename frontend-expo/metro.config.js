const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer = {
	...config.transformer,
	babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};

config.resolver = {
	...config.resolver,
	assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
	sourceExts: [...config.resolver.sourceExts, "svg"],
};

// allow .md files as assets
if (!config.resolver.assetExts.includes("md")) {
	config.resolver.assetExts.push("md");
}

module.exports = config;