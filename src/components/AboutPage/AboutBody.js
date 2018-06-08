import React from 'react'
import Link from 'gatsby-link'
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
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
    margin: 26px 15px 20px 0;
    font-size: 40px;
    font-family: 'Days One';
    text-align: left;
  }
  .blurb-description p {
    text-align: left;
    margin-left: 10px;
  }
`

const bio1 =`
Oh so you'd like to know a little about me? Well I'm flattered. Here we go; Born to a Moroccan Diesel Mechanic and Australian Artist.
             We lived in Port Hedland, Western Australia for 8 years before moving to a very small down called Denmark in Western Australia.
             These small towns, with the typical small town mentalities proved challenging, but somewhat enriching. Finally we settled in Melbourne where I've been since
             the start of my highschool years.
             I only just made it into what could be described as a more driven mode of operation. I am deeply passionate about learning and developing my understanding of the world, perhaps deriving personal existential meaning through this endeavour.
             Strongly rooted in a belief of nurture over nature, and that effort will often trump gifted intelligence. Setting out to prove myself right by working diligently to make my dreams come to fruition.
             I bloomed late in a sense, unfortunately I didn't have any early tutillage to guide me into intellectual pursuits. So I am catching up, albeit quickly, if I can say so myself.

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
              {bio1}
            </p>
          </div>
        </AboutBlurb>
      </Paper>
  </AboutBodyWrapper>
)

export default AboutBody
