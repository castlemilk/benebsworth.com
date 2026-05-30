/**
 *
 * CodeEditor
 *
 */

import React from 'react'
import Embed from 'react-runkit'
import { Helmet } from 'react-helmet'

// import PropTypes from 'prop-types';
// import styled from 'styled-components';

// import { FormattedMessage } from 'react-intl';
import messages from './messages'
// import CodeEditorWrapper from './CodeEditorWrapper';
// TODO: Override runkit css to provide more UI friendly styling
class CodeEditor extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  // componentDidMount () {
  //   const script = document.createElement("script");

  //   script.src = "https://embed.runkit.com";
  //   script.async = false;

  //   document.body.appendChild(script);
  // }
  render () {
    return (
      <div>
        <Embed className='embed' source={messages.codeBlockJS.text} />
      </div>
    )
  }
}

CodeEditor.propTypes = {}

export default CodeEditor
