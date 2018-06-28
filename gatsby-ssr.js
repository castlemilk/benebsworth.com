/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/ssr-apis/
 */

 // You can delete this file if you're not using it
 /* eslint-disable react/no-danger */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { JssProvider } from 'react-jss';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import getPageContext from './src/getPageContext';


exports.replaceRenderer = ({ bodyComponent, replaceBodyHTMLString, setHeadComponents }) => {
  // Get the context of the page to collected side effects.
  const pageContext = getPageContext();
  const sheet = new ServerStyleSheet()
  const bodyHTML = renderToString(
    <StyleSheetManager sheet={sheet.instance}>
        <JssProvider
        registry={pageContext.sheetsRegistry}
        generateClassName={pageContext.generateClassName}
        >
        {React.cloneElement(bodyComponent, {
            pageContext,
        })}
        </JssProvider>
    </StyleSheetManager>
  );

  replaceBodyHTMLString(bodyHTML);
  setHeadComponents([
    <style
      type="text/css"
      id="server-side-jss"
      key="server-side-jss"
      dangerouslySetInnerHTML={{ __html: pageContext.sheetsRegistry.toString() }}
    />,
    sheet.getStyleElement()
  ]);
};