module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: process.versions.node.split('.')[0] } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-transform-class-properties',
  ],
};
