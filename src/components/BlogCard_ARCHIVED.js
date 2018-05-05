import React from 'react'
import styled from "styled-components"

import Paper from 'material-ui/Paper';

import * as d3 from "d3";

const LineWrapper = styled.div`
  .baseline {
    stroke: black;
    stroke-dasharray:4 4;
  }
`
class BlogCard extends React.Component {
  constructor() {
      super();
      this.state = {
        isHover: false,
      }
  }
  handleHover(active) {
    this.setState({ isHover: active})
  }
  componentDidMount() {
    this.setContext();
  }
  /**
   * Helper function to rotate a point around an origin by theta radians
   */
   rotate(origin, point, thetaRadians) {
    const [originX, originY] = origin;
    const [pointX, pointY] = point;

    const rotatedEndX = originX +
      (pointX - originX) * Math.cos(thetaRadians) -
      (pointY - originY) * Math.sin(thetaRadians);
    const rotatedEndY = originY +
      (pointX - originX) * Math.sin(thetaRadians) +
      (pointY - originY) * Math.cos(thetaRadians);

    return [rotatedEndX, rotatedEndY];
  }
  /**
   * Creates a series of jagged points between start and end based on
   * maxPeakHeight for how far away from the midline they get to be and
   * minPeakDistance for how often they occur. If minPeakDistance is not
   * provided, it will add roughly 18 points to the line (every 5% of the
   * line length).
   */
  createJaggedPoints(start, end, maxPeakHeight, minPeakDistance) {
    // we want the one with farthest left X to be 'start'
    let reversed = false;
    if (start[0] > end[0]) {
      const swap = start;
      start = end;
      end = swap;
      reversed = true;
    }

    const [startX, startY] = start;
    const [endX, endY] = end;

    // keep the start point unmodified
    const points = [start];

    // rotate it so end point is horizontal with start point
    const opposite = endY - startY;
    const adjacent = endX - startX;
    const thetaRadians = -Math.atan(opposite / adjacent);

    // compute the overall length of the line
    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    if (!minPeakDistance) {
      minPeakDistance = length * 0.05;
    }

    // compute rotated end point
    const [rotatedEndX, rotatedEndY] = rotate(start, end, thetaRadians);

    // generate the intermediate peak points
    let lastX = startX;
    while (lastX < rotatedEndX - minPeakDistance) {
      // move minPeakDistance from previous X + some random amount, but stop at most at
      // minPeakDistance from the end
      const nextX = Math.min(lastX + minPeakDistance + (Math.random() * minPeakDistance),
        rotatedEndX - minPeakDistance);

      // add some randomness to the expected y position to get peaks
      // we can use startY as the expected y position since we rotated the line to be flat
      const nextY = (maxPeakHeight * (Math.random() - 0.5)) + startY;

      points.push([nextX, nextY]);
      lastX = nextX;
    }

    // add in the end point
    points.push([rotatedEndX, rotatedEndY]);

    // undo the rotation and return the points as the result
    const unrotated = points.map((point, i) => {
      if (i === 0) {
        return start;
      } else if (i === points.length - 1) {
        return end;
      }

      return rotate(start, point, -thetaRadians);
    });

    // restore original directionality if we reversed it
    return reversed ? unrotated.reverse() : unrotated;
  }
  /*
   * Animate the line based on pathSpeed. Uses sroke-dasharray.
   */
  transitionLine(path, pathSpeed) {
    const pathLength = path.node().getTotalLength();
    path
      .attr('stroke-dasharray', '0,100000') // fix safari flash
      .transition()
      .duration(pathLength / (pathSpeed / 1000))
      .ease(d3.easeQuadOut)
      .attrTween('stroke-dasharray', function tweenDash() {
        // Dashed line interpolation trick from https://bl.ocks.org/mbostock/5649592
        const length = this.getTotalLength();
        return d3.interpolateString(`0,${length}`, `${length},${length}`);
      })
      // Remove stroke-dasharray property at the end
      .on('end', function endDashTransition() {
        d3.select(this).attr('stroke-dasharray', 'none');
      });
  }
  /**
   * Draw the original line between the two points
   */
  drawBaseline(start, end) {
    return d3.select('#main-svg').append('path').datum([start, end])
      .classed('baseline', true)
      .attr('d', d3.line());
  }

  /**
   * Helper function to generate a random point in the plot area
   */
  randomPoint() {
    return [
      Math.round(Math.random() * 309),
      Math.round(Math.random() * 250),
    ];
  }


  setContext() {
    // generate random start and end points
    const start = this.randomPoint();
    const end = this.randomPoint();
    this.drawBaseline(start, end)
    const width = 700;
    const height = 500;
    const padding = 50;
    const plotAreaWidth = width - (2 * padding);
    const plotAreaHeight = height - (2 * padding);
    // return d3.select('#main-svg')
    //   .attr('width', width)
    //   .attr('height', height)
    //   .append('g')
    //     .attr('transform', `translate(${padding} ${padding})`);

  }

  render() {
    return (
      <LineWrapper>
        <Paper
          onMouseOver={() => this.handleHover(true)}
          onMouseOut={() => this.handleHover(false)}
          style={{ height: 250, width: 309, display: 'inline-block'}}>
          <div className="container" style={{ height: 250}}>
            <svg id="main-svg"></svg>
          </div>
        </Paper>
      </LineWrapper>
    )
}
}
export default BlogCard
