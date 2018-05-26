import React from 'react';
import PropTypes from 'prop-types';
import VerticalTimelineWrapper from './VerticalTimelineWrapper';

class VerticalTimeline extends React.Component {
  render() {
    const { animate, children } = this.props;
    let { className } = this.props;

    className += ' vertical-timeline';

    if (animate) {
      className += ' vertical-timeline--animate';
    }

    return (
    <VerticalTimelineWrapper>
        <div className={className.trim()}>
            {children}
        </div>
    </VerticalTimelineWrapper>
    );
  }
}

VerticalTimeline.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  className: PropTypes.string,
  animate: PropTypes.bool
};

VerticalTimeline.defaultProps = {
  animate: true,
  className: ''
};

export default VerticalTimeline;