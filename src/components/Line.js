import React from 'react'
import PropTypes from 'prop-types';
import Paper from 'material-ui/Paper';
class BlogLine extends React.Component {
  constructor() {
      super();
  }
  handleHover(active) {
  }
  getDefaultProps() {
    return {
      stroke: 'blue',
      fill: 'none',
      strokeWidth: 3
    };
  },

  render() {
    let { path, stroke, fill, strokeWidth } = this.props;
    return (
      <path
        d={path}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        />
    );
  }
}
ListItem.propTypes = {
  path:         PropTypes.string.isRequired,
  stroke:       PropTypes.string,
  fill:         PropTypes.string,
  strokeWidth:  PropTypes.number
};

export default BlogLine
