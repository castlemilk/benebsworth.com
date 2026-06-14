module.exports = {
  pathPrefix: `/archive`,
  siteMetadata: {
    title: "Ben Ebsworth",
    author: `Ben Ebsworth`,
    description: `A playground for development and writing material`,
    siteUrl: `https://benebsworth.com/`,
    social: {
      twitter: `sycli`,
      linkedin: `ben-ebsworth`,
    },
  },
  plugins: [
    {
      resolve: `gatsby-plugin-material-ui`,
      options: {
        stylesProvider: {
          injectFirst: true,
        },
      },
    },
    {
      resolve: "gatsby-plugin-antd-v2",
      options: {
        style: true,
      },
    },
    `gatsby-plugin-styled-components`,
    `gatsby-plugin-react-helmet`,
    // gatsby-transformer-sharp and gatsby-plugin-sharp disabled — native sharp
    // module won't compile on Darwin 25.5 / arm64.
    // `gatsby-transformer-sharp`,
    // `gatsby-plugin-sharp`,
    `gatsby-plugin-offline`,
    // gatsby-plugin-prefetch-google-fonts disabled — ENOENT on .cache/google-fonts
    // {
    //   resolve: `gatsby-plugin-prefetch-google-fonts`,
    //   options: { fonts: [{ family: `Prompt` }, { family: `Open Sans`, variants: [`400`, `700`] }] },
    // },
    `gatsby-plugin-feed-mdx`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/blog`,
        name: `blog`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/assets`,
        name: `assets`,
      },
    },
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [".mdx", ".md"],
        gatsbyRemarkPlugins: [
          // gatsby-remark-images disabled — requires gatsby-plugin-sharp
          // {
          //   resolve: `gatsby-remark-images`,
          //   options: { maxWidth: 1200, backgroundColor: `transparent`, linkImagesToOriginal: true },
          // },
          {
            resolve: `gatsby-remark-responsive-iframe`,
            options: {
              wrapperStyle: `margin-bottom: 1.0725rem`,
            },
          },
          // gatsby-remark-vscode disabled — oniguruma won't compile on arm64
          // {
          //   resolve: `gatsby-remark-vscode`,
          // },
          {
            resolve: `gatsby-remark-copy-linked-files`,
          },
          {
            resolve: `gatsby-remark-prismjs`,
          },
          {
            resolve: `gatsby-remark-smartypants`,
          },
        ],
      },
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: "UA-119767237-1",
        head: false,
        anonymize: false,
        respectDNT: false,
      },
    },
    // gatsby-plugin-manifest disabled — requires gatsby-plugin-sharp for icon processing
    // {
    //   resolve: `gatsby-plugin-manifest`,
    //   options: {
    //     name: `Ben Ebsworth's Blog`,
    //     short_name: `Ben Ebsworth - Home`,
    //     description: `Ben Ebsworth's Person space. Contains About|Blog|Projects. General playground for experimenting with web technologies`,
    //     lang: `en`,
    //     start_url: `/`,
    //     display: `standalone`,
    //     icon: `src/assets/images/icon.png`,
    //   },
    // },
    {
      resolve: `gatsby-plugin-typography`,
      options: {
        pathToConfigModule: `src/utils/typography`,
      },
    },
  ],
}
