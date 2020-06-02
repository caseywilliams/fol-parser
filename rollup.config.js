const resolve = require('@rollup/plugin-node-resolve').default
const commonjs = require('@rollup/plugin-commonjs')
const html = require('@rollup/plugin-html')

module.exports = [{
  input: 'app/index.js',
  output: {
    dir: 'docs',
    format: 'umd'
  },
  plugins: [
    resolve(),
    commonjs(),
    html({ title: 'fol-parser' }),
  ]
}]
