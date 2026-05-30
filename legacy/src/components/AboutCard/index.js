import React from "react"

import { Motion, spring } from "react-motion"
import AboutPanel from "./AboutPanel"
import AboutAnimation from "./AboutAnimation"

/**
 * TODO: add a spray-paint like animation that reveals the underlying rgb image beneath the black and white svg stenline, as the user mouses over the stencil
 * it will spray paint reveal the underlying image.
 */
class AboutCard extends React.Component {
  constructor() {
    super()
    this.state = {
      isHover: false,
    }
  }
  handleHover(active) {
    this.setState({ isHover: active })
  }
  getSpringProps() {
    return {
      defaultStyle: {
        scale: 1.15,
        marginTop: 0,
        marginLeft: 0,
        imageOpacity: 0.7,
        opacity: 0,
        fontSize: 25,
        titleBackgroundWidth: 70,
        titleBackgroundHeight: 20,
      },
      style: {
        scale: spring(this.state.isHover ? 1 : 1.15),
        marginTop: spring(this.state.isHover ? 0 : 0),
        marginLeft: spring(this.state.isHover ? 0 : 0),
        imageOpacity: spring(this.state.isHover ? 0.4 : 0.7),
        opacity: spring(this.state.isHover ? 1 : 0),
        fontSize: spring(this.state.isHover ? 35 : 25),
        titleBackgroundWidth: spring(this.state.isHover ? 100 : 70),
        titleBackgroundHeight: spring(this.state.isHover ? 45 : 30),
      },
      titleBackgroundWidth: spring(this.state.isHover ? 100 : 75),
      titleBackgroundHeight: spring(this.state.isHover ? 45 : 20),
    }
  }
  render() {
    return (
      <div
        onMouseOver={() => this.handleHover(true)}
        onMouseOut={() => this.handleHover(false)}
        style={{ height: 250, width: 309, display: "inline-block" }}
      >
        <div className="container" style={{ height: 250, width: 311 }}>
          <Motion {...this.getSpringProps()}>
            {tweenCollection => {
              let styleTitle = {
                marginTop: tweenCollection.marginTop + "%",
                marginLeft: tweenCollection.marginLeft + "%",
                zIndex: 10,
                position: "absolute",
                fontSize: tweenCollection.fontSize,
              }
              return (
                <div className="subcontainer">
                  <div className="animation-1">
                    <AboutAnimation />
                  </div>
                  <div className="title-subcontainer">
                    <div className="title-content" style={styleTitle}>
                      <AboutPanel
                        titleBackgroundWidth={
                          tweenCollection.titleBackgroundWidth
                        }
                        titleBackgroundHeight={
                          tweenCollection.titleBackgroundHeight
                        }
                      />
                    </div>
                  </div>
                </div>
              )
            }}
          </Motion>
        </div>
      </div>
    )
  }
}
export default AboutCard
