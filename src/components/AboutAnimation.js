import React from 'react'
import styled from "styled-components"
// import Anime from 'react-anime';
import CrossfadeImage from '../lib/CrossfadeImage';
import MtSvgLines from 'react-mt-svg-lines';
import AboutSVG from './AboutSVG';
import AboutPNG from '../assets/images/portrait.png'
const RealImage = styled.div`
  -webkit-animation: 3s ease 0s normal forwards 1 fadein;
  animation: 3s ease 0s normal forwards 1 fadein;
  z-index: 5;
  @keyframes fadein {
    0% { opacity:0; }
    66% { opacity:0; }
    100% { opacity:1; }
  }

  @-webkit-keyframes fadein {
      0% { opacity:0; }
      66% { opacity:0; }
      100% { opacity:1; }
  }
`
const AboutAnimation = (props) => {
  return (
    <div style={{ position: 'absolute'}}>
      <RealImage>
        <img style={{ zIndex: 5, position: 'absolute'}} src={AboutPNG}/>
      </RealImage>
      <MtSvgLines animate={ true } duration={ 2000 } style={{ zIndex: 4, position: 'absolute'}}>
        <AboutSVG />
      </MtSvgLines>


    </div>
  )
}
export default AboutAnimation
