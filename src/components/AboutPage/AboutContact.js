import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';

const AboutContactWrapper = styled.div`
    display: inline-block;
    height: 160px;
    width: 50%;
    float: right;
    background-color: black;
    .contact-header {
        background-color: black;
    }
    .contact-header span {
        font-size: 30px;
        font-family: 'Days One';
        background-color: black;
        color: white;
        margin-left: 10px;
    }

`
const AboutContact = (props) => (
  <AboutContactWrapper>
      <Paper >
          <div className="contact-header" >
            <span>
            Contact.
            </span>
            
          </div>
      </Paper>
  </AboutContactWrapper>
)

export default AboutContact
