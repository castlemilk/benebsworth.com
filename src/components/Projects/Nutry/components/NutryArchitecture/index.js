/**
 *
 * NutryArchitecture
 *
 */

import React from 'react'

import architectureAI from '../../images/architectureAI.svg'
import architectureAPI from '../../images/architectureAPI.svg'
import architectureCoreSystem from '../../images/architectureCoreSystem.svg'
import architectureDataSources from '../../images/architectureDataSources.svg'
import architectureGUI from '../../images/architectureGUI.svg'
import architecturePathOne from '../../images/architecturePathOne.svg'
import architecturePathTwo from '../../images/architecturePathTwo.svg'
import architecturePathThree from '../../images/architecturePathThree.svg'
import architectureEnterprise from '../../images/architectureEnterprise.svg'

import architectureAIMobile from '../../images/mobile/architectureAIMobile.svg'
import architectureAPIMobile from '../../images/mobile/architectureAPIMobile.svg'
import architectureCoreSystemMobile from '../../images/mobile/architectureCoreSystemMobile.svg'
import architectureDataSourcesMobile from '../../images/mobile/architectureDataSourcesMobile.svg'
import architectureGUIMobile from '../../images/mobile/architectureGUIMobile.svg'
import architecturePathOneMobile from '../../images/mobile/architecturePathOneMobile.svg'
import architecturePathTwoMobile from '../../images/mobile/architecturePathTwoMobile.svg'
import architecturePathThreeMobile from '../../images/mobile/architecturePathThreeMobile.svg'
import architectureEnterpriseMobile from '../../images/mobile/architectureEnterpriseMobile.svg'

import NutryArchitectureWrapper from './NutryArchitectureWrapper'
import NutryArchitectureMobileWrapper from './NutryArchitectureMobileWrapper'
const dataWeb = [
  {
    className: 'architectureDataSources',
    img: architectureDataSources
  },
  {
    className: 'architecturePathOne',
    img: architecturePathOne
  },
  {
    className: 'architectureCoreSystem',
    img: architectureCoreSystem
  },
  {
    className: 'architecturePathTwo',
    img: architecturePathTwo
  },
  {
    className: 'architectureAI',
    img: architectureAI
  },
  {
    className: 'architecturePathThree',
    img: architecturePathThree
  },
  {
    className: 'architectureEnterprise',
    img: architectureEnterprise
  },
  {
    className: 'architectureGUI',
    img: architectureGUI
  },
  {
    className: 'architectureAPI',
    img: architectureAPI
  }
]
const dataMobile = [
  {
    className: 'architectureDataSources',
    img: architectureDataSourcesMobile
  },
  {
    className: 'architecturePathOne',
    img: architecturePathOneMobile
  },
  {
    className: 'architectureCoreSystem',
    img: architectureCoreSystemMobile
  },
  {
    className: 'architecturePathTwo',
    img: architecturePathTwoMobile
  },
  {
    className: 'architectureAI',
    img: architectureAIMobile
  },
  {
    className: 'architecturePathThree',
    img: architecturePathThreeMobile
  },
  {
    className: 'architectureEnterprise',
    img: architectureEnterpriseMobile
  },
  {
    className: 'architectureGUI',
    img: architectureGUIMobile
  },
  {
    className: 'architectureAPI',
    img: architectureAPIMobile
  }
]

class NutryArchitecture extends React.Component {
  constructor (props) {
    super(props)
    this.state = { windowWidth: 1700 }
    this.handleWindowSizeChange = this.handleWindowSizeChange.bind(this)
  }
  componentWillUnmount () {
    typeof window !== 'undefined' &&
      window.removeEventListener('resize', this.handleWindowSizeChange)
    clearTimeout(this.transitionTimeout)
  }
  handleWindowSizeChange () {
    typeof window !== 'undefined' &&
      setTimeout(this.setState({ windowWidth: window.innerWidth }))
    // typeof window !== 'undefined' && console.log(window.innerWidth)
  }
  componentDidMount () {
    this._ismounted = true
    setTimeout(window.addEventListener('resize', this.handleWindowSizeChange))
    typeof window !== 'undefined' &&
      setTimeout(
        this.setState({
          windowWidth: window.innerWidth
        })
      )
    // typeof window !== 'undefined' && console.log(window.innerWidth)
    // typeof window !== 'undefined' && console.log(window.innerWidth <=610)
  }
  render () {
    const isMobile = this.state.windowWidth <= 610
    const imagesMobile = dataMobile.map(item => (
      <img
        key={item.className}
        alt=''
        onFocus={() => this.props.onHover(item.className)}
        onMouseOver={() => this.props.onHover(item.className)}
        className={item.className}
        src={item.img}
      />
    ))
    const images = dataWeb.map(item => (
      <img
        key={item.className}
        alt=''
        onFocus={() => this.props.onHover(item.className)}
        onMouseOver={() => this.props.onHover(item.className)}
        className={item.className}
        src={item.img}
      />
    ))
    const webView = (
      <div>
        <NutryArchitectureWrapper>
          <div className='architecture-box'>{images}</div>
        </NutryArchitectureWrapper>
      </div>
    )
    const mobileView = (
      <div>
        <NutryArchitectureMobileWrapper>
          <div className='architecture-box'>{imagesMobile}</div>
        </NutryArchitectureMobileWrapper>
      </div>
    )
    return isMobile ? mobileView : webView
  }
}

export default NutryArchitecture
