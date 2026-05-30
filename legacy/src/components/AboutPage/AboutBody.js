import React from "react"
import styled from "styled-components"

const AboutBodyWrapper = styled.div`
  text-align: center;
  width: 100%;
  font-family: Avenir Next, sans-serif;
`

const Paper = styled.div`
  -webkit-box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  -moz-box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  width: 100%;
  display: inline-flex;
  justify-content: center;
  text-align: center;
  margin-bottom: 20px;
`

const AboutBlurb = styled.div`
  font-family: Avenir Next, sans-serif;
  color: black;
  @media (max-width: 991px) {
    .blurb-description p span {
      font-size: 30px;
      margin: 16px 20px 10px 0;
      text-align: left;
      margin-left: 10px;
      margin-top: 10px;
      margin-right: 10px;
    }
  }
  @media (max-width: 1199px) {
    .blurb-description p span {
      font-size: 30px;
      text-align: left;
      font-family: Avenir Next, sans-serif;
      font-weight: bold;
      color: black;
      margin-left: 10px;
      margin-top: 10px;
      margin-right: 10px;
    }
  }
  .blurb-description p span {
    float: left;
    margin: 26px 15px 20px 0;
    font-size: 40px;
    font-family: Avenir Next, sans-serif;
    font-weight: bold;
    text-align: left;
    color: black;
  }
  .blurb-description p {
    font-family: Avenir Next, sans-serif;
    text-align: left;
    margin-left: 10px;
    margin-top: 10px;
    margin-right: 10px;
    color: black;
  }
  color: black;
`

const bio1 = `
Highly self-driven Engineer who is continually exploring new learnings. This place acts as place for playing around with new ideas. 
Actively building my capability to be able to robustly execute on entrepreneurial endeavors. I obtain great satisfaction from brining to 
fruition new creations, this pursuit gives existential meaning. I'm glad you've stopped by 😊
`
const AboutBody = props => (
  <AboutBodyWrapper>
    <Paper>
      <AboutBlurb>
        <div className="blurb-description">
          <p>
            <span>Blurb.</span>
            {bio1}
          </p>
        </div>
      </AboutBlurb>
    </Paper>
  </AboutBodyWrapper>
)

export default AboutBody
