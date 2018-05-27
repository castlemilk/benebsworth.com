import React, { Component } from "react"
import * as PropTypes from "prop-types"
import { injectGlobal } from 'styled-components'
import Helmet from 'react-helmet'

injectGlobal`
h2,h3,h4 {
  font-family: 'Days One';
}
p {
  font-family: 'Open Sans';
}
.vertical-timeline-element-date {
  font-family: 'Days One';
}
`

class Html extends Component {
    
    render() {
        return (
            <html op="news" lang="en">
              <head>
                {this.props.headComponents}
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1.0"
                />
                <title>Ben Ebsworth</title>
              </head>
              <body>
                
                    <div
                    id="___gatsby"
                    dangerouslySetInnerHTML={{ __html: this.props.body }}
                    />
                    {this.props.postBodyComponents}

              </body>
            </html>
          )
        }
      }
      
// Html.propTypes = PropTypes

export default Html;