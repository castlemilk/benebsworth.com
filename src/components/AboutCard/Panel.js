import React from 'react'

const styles = {
  zIndex: 2
}
export default class Panel extends React.Component {
  render () {
    const strokeSize = 2
    const { bounds } = this.props
    return (
      <svg style={styles} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
        <g stroke='white' strokeWidth={strokeSize} fill='white'>
          <path vectorEffect='non-scaling-stroke' d={this.props.path} />
        </g>
      </svg>
    )
  }
}
