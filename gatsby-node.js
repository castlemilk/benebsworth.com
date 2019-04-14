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

//Add Babel plugin
try {
  require.resolve(`babel-plugin-styled-components`)
} catch (e) {
  throw new Error(
    `'babel-plugin-styled-components' is not installed which is needed by plugin 'gatsby-plugin-styled-components'`
  )
}

exports.onCreateBabelConfig = ({ stage, actions }, pluginOptions) => {
  actions.setBabelPlugin({
    name: `babel-plugin-styled-components`,
    stage,
    options: {
      ...pluginOptions,
      ssr: stage === `build-html`,
    },
  })
}

const path = require(`path`)
const { createFilePath } = require(`gatsby-source-filesystem`)

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions

  const blogPost = path.resolve(`./src/templates/blog-post.js`)
  return graphql(
    `
      {
        allMarkdownRemark(
          sort: { fields: [frontmatter___date], order: DESC }
          limit: 1000
        ) {
          edges {
            node {
              fields {
                slug
              }
              frontmatter {
                title
              }
            }
          }
        }
      }
    `
  ).then(result => {
    if (result.errors) {
      throw result.errors
    }

    // Create blog posts pages.
    const posts = result.data.allMarkdownRemark.edges

    posts.forEach((post, index) => {
      const previous = index === posts.length - 1 ? null : posts[index + 1].node
      const next = index === 0 ? null : posts[index - 1].node

      createPage({
        path: post.node.fields.slug,
        component: blogPost,
        context: {
          slug: post.node.fields.slug,
          previous,
          next,
        },
      })
    })

    return null
  })
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
}

