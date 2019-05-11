import React from 'react'
import PropTypes from 'prop-types'
import VisibilitySensor from 'react-visibility-sensor'

import VerticalTimelineElementWrapper from './VerticalTimelineElementWrapper'

class VerticalTimelineElement extends React.Component {
  constructor (props) {
    super(props)
    this.onVisibilitySensorChange = this.onVisibilitySensorChange.bind(this)
    this.state = { visible: false }
  }

  onVisibilitySensorChange (isVisible) {
    if (isVisible) {
      this.setState({ visible: true })
    }
  }

  render () {
    const { id, children, icon, iconStyle, date, position, style } = this.props
    let { className } = this.props

    className += ' vertical-timeline-element'

    if (position === 'left') {
      className += ' vertical-timeline-element--left'
    }

    if (position === 'right') {
      className += ' vertical-timeline-element--right'
    }

    return (
      <VerticalTimelineElementWrapper isVisible={this.state.isVisible}>
        <VisibilitySensor onChange={this.onVisibilitySensorChange}>
          <div id={id} className={className} style={style}>
            <div>
              <span
                style={iconStyle}
                className={`vertical-timeline-element-icon ${
                  this.state.visible ? 'bounce-in' : 'is-hidden'
                }`}
              >
                {icon}
              </span>
              <div
                className={`vertical-timeline-element-content ${
                  this.state.visible ? 'bounce-in' : 'is-hidden'
                }`}
              >
                {children}
                <span className='vertical-timeline-element-date'>{date}</span>
              </div>
            </div>
          </div>
        </VisibilitySensor>
      </VerticalTimelineElementWrapper>
    )
  }
}

VerticalTimelineElement.propTypes = {
  id: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  className: PropTypes.string,
  icon: PropTypes.element,
  iconStyle: PropTypes.shape({}),
  style: PropTypes.shape({}),
  date: PropTypes.string,
  position: PropTypes.string
}

VerticalTimelineElement.defaultProps = {
  id: '',
  children: '',
  className: '',
  icon: null,
  iconStyle: null,
  style: null,
  date: '',
  position: ''
}

export default VerticalTimelineElement
