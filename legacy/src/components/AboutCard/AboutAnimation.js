import React from "react"
import styled from "styled-components"
import MtSvgLines from "react-mt-svg-lines"
import AboutSVG from "./AboutSVG"
import AboutPNG from "../../assets/images/portrait.jpg"
/**
 * TODO: add a spray-paint like animation that reveals the underlying rgb image beneath the black and white svg stenline, as the user mouses over the stencil
 * it will spray paint reveal the underlying image.
 */
const RealImage = styled.div`
  -webkit-animation: 3s ease 0s normal forwards 1 fadein;
  animation: 3s ease 0s normal forwards 1 fadein;
  z-index: 5;
  @keyframes fadein {
    0% {
      opacity: 0;
    }
    66% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  @-webkit-keyframes fadein {
    0% {
      opacity: 0;
    }
    66% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
`
class AboutAnimation extends React.Component {
  constructor() {
    super()
    this.state = { loading: true, hidden: "none" }
  }

  componentWillMount() {
    this.setState({ loading: false })
    setTimeout(() => this.show(), 100)
  }
  show() {
    this.setState({ hidden: "block" })
  }
  render() {
    const loadingView = <div>loading</div>
    return this.state.loading ? (
      loadingView
    ) : (
      <div>
        <div style={{ zIndex: 5, position: "absolute" }}>
          <RealImage fixed={AboutPNG}>
            <img alt="about-image" src={AboutPNG} height={274} />
          </RealImage>
        </div>
        <div style={{ display: this.state.hidden }}>
          <div style={{ position: "absolute" }}>
            <MtSvgLines
              animate={500}
              duration={2000}
              style={{ zIndex: 4, position: "absolute" }}
            >
              <AboutSVG style={{ zIndex: 3, position: "absolute" }} />
            </MtSvgLines>
          </div>
        </div>
      </div>
    )
  }
}
export default AboutAnimation
