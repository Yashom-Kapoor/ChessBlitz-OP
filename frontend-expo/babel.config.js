module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [], // keep this as an empty array; don't remove entirely
  };
};
