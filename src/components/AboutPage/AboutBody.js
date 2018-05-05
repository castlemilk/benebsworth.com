import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';

const AboutBodyWrapper = styled.div`
    text-align: center;
    width: 100%;

`
const AboutBlurb = styled.div`
  @media (max-width: 991px) {
    .blurb-description p span {
        font-size: 30px;
        margin: 16px 20px 10px 0;
        text-align: left;
    }
  }
  @media (max-width: 1199px) {
    .blurb-description p span {
        font-size: 30px;
        text-align: left;
    }
  }
  .blurb-description p span {
    float: left;
    margin: 26px 20px 20px 0;
    font-size: 40px;
    font-family: 'Days One';
    text-align: left;
  }
  .blurb-description p {
    text-align: left;
    margin-left: 10px;
  }
`


const AboutBody = (props) => (
  <AboutBodyWrapper>
      <Paper>
        <AboutBlurb >
          <div className="blurb-description" >
            <p>
              <span>
                Blurb.
              </span>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer accumsan magna ac interdum semper. Donec lobortis nulla id massa porta bibendum. Morbi feugiat nisi eget viverra condimentum. In et consectetur nulla, vel lobortis enim. Nunc vel luctus felis. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec molestie est nulla, vitae fringilla nibh aliquet ac. Integer imperdiet est vel arcu fermentum, vel varius nisl lobortis. Nulla tristique, nulla ac varius scelerisque, lorem nibh auctor felis, at scelerisque libero neque eget erat. Pellentesque accumsan aliquet turpis a mollis. Phasellus elementum cursus hendrerit. In sed venenatis erat. Curabitur a nulla dolor. Nam vitae ultrices massa. Integer suscipit commodo laoreet.
            </p>
          </div>
        </AboutBlurb>
      </Paper>
  </AboutBodyWrapper>
)

export default AboutBody
