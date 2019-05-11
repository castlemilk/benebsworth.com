import './global.css'

import Typography from 'typography'
import Wordpress2016 from 'typography-theme-wordpress-2016'

Wordpress2016.overrideThemeStyles = () => {
  return {
    'a.gatsby-resp-image-link': {
      boxShadow: `none`
    },
    a: {
      boxShadow: `none`
    },
    div: {
      fontFamily: `Avenir Next, sans-serif`
    },
    span: {
      fontFamily: `Avenir Next, sans-serif`
    },
    h1: {
      fontFamily: `Avenir Next, sans-serif`,
      color: `var(--textTitle)`
    },
    h2: {
      fontFamily: `Avenir Next, sans-serif`,
      color: `var(--textTitle)`
    },
    'h3.vertical-timeline-element-title': {
      fontFamily: `Avenir Next, sans-serif`,
      fontWeight: `bold`,
      color: `var(--textTitle)`
    },
    'h4.vertical-timeline-element-subtitle': {
      fontFamily: `Avenir Next, sans-serif`,
      fontWeight: `bold`,
      marginTop: `10px`,
      color: `var(--textTitle)`
    },
    hr: {
      background: 'var(--hr)'
    },
    'a.gatsby-resp-image-link': {
      boxShadow: 'none'
    },
    // These two are for gatsby-remark-autolink-headers:
    'a.anchor': {
      boxShadow: 'none'
    },
    'a.anchor svg[aria-hidden="true"]': {
      stroke: 'var(--textLink)'
    },
    'p code': {
      fontSize: '1rem'
    },
    // TODO: why tho
    'h1 code, h2 code, h3 code, h4 code, h5 code, h6 code': {
      fontSize: 'inherit'
    },
    'li code': {
      fontSize: '1rem'
    },
    ul: {
      marginLeft: `28px`
    },
    ol: {},
    blockquote: {
      color: 'inherit',
      borderLeftColor: 'inherit',
      opacity: '0.8'
    },
    'blockquote.translation': {
      fontSize: '1em'
    }
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
