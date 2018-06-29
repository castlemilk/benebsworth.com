/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

 // You can delete this file if you're not using it
//  const generateBabelConfig = require("gatsby/dist/utils/babel-config");
//  exports.modifyWebpackConfig = ({ config, stage }) => {
//    const program = {
//       directory: __dirname,
//       browserslist: ["> 1%", "last 2 versions", "IE >= 9"],
//    };
//
//
//    return generateBabelConfig(program, stage).then(babelConfig => {
//      config.loader("snap", {
//        // test: require.resolve('snapsvg'),
//        test: /snapsvg/,
//        loader: 'imports-loader?this=>window,fix=>module.exports=0'
//      });
//    });
// };
// exports.onCreateWebpackConfig = ({ stage,
//   rules,
//   loaders,
//   plugins,
//   actions, }) => {
//   actions.setWebpackConfig({
//     module: {
//       rules: [
//         {
//           test: require.resolve('snapsvg'),
//           loader: 'imports-loader?this=>window,fix=>module.exports=0'
//         },
//         {
//           test: /svgpathplayer/,
//           loader: 'imports-loader?this=>window,fix=>module.exports=0'
//         }
//       ]
//     },
//     plugins: [
//       plugins.define({
//         __DEVELOPMENT__: stage === `develop` || stage === `develop-html`,
//       }),
//     ],
//   })
// };

// //Add Babel plugin
// try {
//   require.resolve(`babel-plugin-styled-components`)
// } catch (e) {
//   throw new Error(
//     `'babel-plugin-styled-components' is not installed which is needed by plugin 'gatsby-plugin-styled-components'`
//   )
// }

// exports.onCreateBabelConfig = ({ stage, actions }, pluginOptions) => {
//   actions.setBabelPlugin({
//     name: `babel-plugin-styled-components`,
//     stage,
//     options: {
//       ...pluginOptions,
//       ssr: stage === `build-html`,
//     },
//   })
// }
