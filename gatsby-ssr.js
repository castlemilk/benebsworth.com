// /**
//  * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
//  *
//  * See: https://www.gatsbyjs.org/docs/ssr-apis/
//  */

//  // You can delete this file if you're not using it
//  /* eslint-disable react/no-danger */

import React from 'react'
import { renderToString } from 'react-dom/server'
import { JssProvider } from 'react-jss'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'
import getPageContext from './src/getPageContext'

export const replaceRenderer = ({
  bodyComponent,
  replaceBodyHTMLString,
  setHeadComponents
}) => {
  // Get the context of the page to collected side effects.
  const pageContext = getPageContext()
  const sheet = new ServerStyleSheet()
  const bodyHTML = renderToString(
    <JssProvider
      registry={pageContext.sheetsRegistry}
      generateClassName={pageContext.generateClassName}
    >
      <StyleSheetManager sheet={sheet.instance}>
        {React.cloneElement(bodyComponent, {
          pageContext
        })}
      </StyleSheetManager>
    </JssProvider>
  )
  //   const bodyHTML = renderToString(
  //       <StyleSheetManager sheet={sheet.instance}>
  //         {bodyComponent}
  //       </StyleSheetManager>
  //   );

  replaceBodyHTMLString(bodyHTML)
  setHeadComponents([
    <style
      type='text/css'
      id='server-side-jss'
      key='server-side-jss'
      dangerouslySetInnerHTML={{
        __html: pageContext.sheetsRegistry.toString()
      }}
    />,
    sheet.getStyleElement()
  ])
}

// import React from "react"
// import { ServerStyleSheet, StyleSheetManager } from "styled-components"
// import { renderToString } from "react-dom/server"

// export const replaceRenderer = ({
//   bodyComponent,
//   replaceBodyHTMLString,
//   setHeadComponents,
// }) => {
//   const sheet = new ServerStyleSheet()

//   const app = (
//     <StyleSheetManager sheet={sheet.instance}>
//       {bodyComponent}
//     </StyleSheetManager>
//   )

//   const body = renderToString(app)

//   replaceBodyHTMLString(body)
//   setHeadComponents([sheet.getStyleElement()])

//   return
// }
export const onRenderBody = ({ setHeadComponents }) => {
  setHeadComponents([
    <link
      rel="dns-prefetch"
      key="dns-prefetch-google-analytics"
      href="https://www.google-analytics.com"
    />,
    <link
      rel="preconnect"
      key="google-analytics-preconnect"
      href="https://www.google-analytics.com"
    />,
    <link
      rel="dns-prefetch"
      key="dns-prefetch-google-analytics-1"
      href="https://marketingplatform.google.com"
    />,
    <link
    rel="preconnect"
    key="google-analytics-preconnect-1"
    href="https://marketingplatform.google.com"
  />,
  <link
      rel="dns-prefetch"
      key="dns-prefetch-google-analytics-2"
      href="https://www.google.com"
    />,
    <link
    rel="preconnect"
    key="google-analytics-preconnect-2"
    href="https://www.google.com"
  />,
  ]);
};
