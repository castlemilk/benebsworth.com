module.exports = {
  siteMetadata: {
    title: 'Ben Ebsworth',
  },
  plugins: [
    'gatsby-plugin-react-helmet',
    'gatsby-plugin-styled-components',
    {
      resolve: 'gatsby-plugin-google-fonts',
      options: {
        fonts: [
        'Days One',
        ]
      }
  }
  ],
}
