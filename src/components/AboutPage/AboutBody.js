import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';

const AboutBodyWrapper = styled.div`
    text-align: center;
    display: inline-block;
    width: 100%;
`

const AboutBody = (props) => (
  <AboutBodyWrapper>
      <Paper>
          body
      </Paper>
  </AboutBodyWrapper>
)

export default AboutBody
