import React from 'react'
import AboutSVG from './AboutSVG';
import MtSvgLines from 'react-mt-svg-lines';
const AboutAnimation = (props) => {
  return (
    <MtSvgLines animate={ true } duration={ 2000 }>
      <AboutSVG />
    </MtSvgLines>
  )
}
export default AboutAnimation
