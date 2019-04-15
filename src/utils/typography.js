import Typography from "typography"
import Wordpress2016 from "typography-theme-wordpress-2016"

Wordpress2016.overrideThemeStyles = () => {
  return {
    "a.gatsby-resp-image-link": {
      boxShadow: `none`,
    },
    "a": {
      boxShadow: `none`
    },
    "div": {
      fontFamily: `Avenir Next, sans-serif`
    },
    "span": {
      fontFamily: `Avenir Next, sans-serif`
    },
    "h1": {
      fontFamily: `Avenir Next, sans-serif`
    },
    "h2": {
      fontFamily: `Avenir Next, sans-serif`
    },
    "h3.vertical-timeline-element-title": {
      fontFamily: `Avenir Next, sans-serif`,
      fontWeight: `bold`
    },
    "h4.vertical-timeline-element-subtitle": {
      fontFamily: `Avenir Next, sans-serif`,
      fontWeight: `bold`,
      marginTop: `10px`
    },
  }
}

delete Wordpress2016.googleFonts

const typography = new Typography(Wordpress2016)

// Hot reload typography in development.
if (process.env.NODE_ENV !== `production`) {
  typography.injectStyles()
}

export default typography
export const rhythm = typography.rhythm
export const scale = typography.scale
