module.exports = {
  siteMetadata: {
    title: 'Ben Ebsworth',
  },
  plugins: [
    // 'gatsby-plugin-react-helmet',
    // 'gatsby-plugin-antd',
    // 'gatsby-plugin-styled-components',
    {
      resolve: 'gatsby-plugin-antd-v2',
      options: {
        style: true
      }
    },
    {
      resolve: 'gatsby-plugin-google-fonts',
      options: {
        fonts: [
        'Days One',
        'Open Sans'
        ]
      }
  },
  // {
  //   resolve: 'gatsby-plugin-material-ui'
  // },
  {
    resolve: `gatsby-plugin-google-analytics`,
    options: {
      trackingId: "UA-119767237-1",
      // Puts tracking script in the head instead of the body
      head: false,
      // Setting this parameter is optional
      anonymize: false,
      // Setting this parameter is also optional
      respectDNT: false
    },
  },
  ],
}
