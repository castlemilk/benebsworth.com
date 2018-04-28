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
exports.modifyWebpackConfig = ({ config, stage }) => {
  if (stage === "build-html") {
    config.loader("snapsvg", {
      test: require.resolve('snapsvg'),
      loader: 'imports-loader?this=>window,fix=>module.exports=0'
    });
    config.loader("svgpathplayer", {
      test: /svgpathplayer/,
      loader: 'imports-loader?this=>window,fix=>module.exports=0'
    });
  }

  return config;
};
