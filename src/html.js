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
        const body = (<div
            style={{
                margin: '0 auto',
                maxWidth: 960,
                padding: '0px 1.0875rem 1.45rem',
                paddingTop: 0,
            }}
            >
            {this.props.body}
            </div>
        )
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
                    dangerouslySetInnerHTML={{ __html: body }}
                    />
                    {this.props.postBodyComponents}

              </body>
            </html>
          )
        }
      }
      
Html.propTypes = PropTypes

export default Html;