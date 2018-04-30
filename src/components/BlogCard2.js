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
class BlogCard2 extends React.Component {
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
  collide(alpha) {
    var quadtree = d3.geom.quadtree(nodes);
    return function(d) {
      var r = d.radius + radius.domain()[1] + padding,
      nx1 = d.x - r,
      nx2 = d.x + r,
      ny1 = d.y - r,
      ny2 = d.y + r;
      quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
        y = d.y - quad.point.y,
        l = Math.sqrt(x * x + y * y),
        r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
        if (l < r) {
        l = (l - r) / l * alpha;
        d.x -= x *= l;
        d.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2
    || x2 < nx1
    || y1 > ny2
    || y2 < ny1;
    });
    };
  };

  setContext() {
    const margin = {top: 0, right: 0, bottom: 0, left: 0};
    const width = 309 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;
    const rect = [0,0, width - 0, height - 0];
    const n = 20;
    const m = 4;
    const padding = 6;
    const maxSpeed = 300;
    const radius = d3.scaleSqrt().range([0, 8]);
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.range(m));
    var nodes = [];

    for (let i of d3.range(n) ){
    nodes.push({radius: radius(1 + Math.floor(Math.random() * 4)),
      color: color(Math.floor(Math.random() * m)),
      x: rect[0] + (Math.random() * (rect[2] - rect[0])),
      y: rect[1] + (Math.random() * (rect[3] - rect[1])),
      speedX: (Math.random() - 0.5) * 2 *maxSpeed,
      speedY: (Math.random() - 0.5) * 2 *maxSpeed});
    }
    var force = d3.forceSimulation()
    .nodes(nodes)
    .on("tick", tick)
    var svg = d3.select(".container-blog").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.append("svg:rect")
      .attr("width", rect[2] - rect[0])
      .attr("height", rect[3] - rect[1])
      .attr("x", rect[0])
      .attr("y", rect[1])
      .style("fill", "None")
      .style("stroke", "#222222");
    console.log(svg.selectAll("circle"))
    var circle = svg.selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", function(d) { return d.radius; })
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .style("fill", function(d) { console.log(d.color); return d.color; })
      // .call(force.drag);
    console.log(circle)
    var flag = false;
    function tick() {
      // console.log(e)
      force.alpha(0.1);
      function gravity(alpha) {
        return function(d) {
        if ((d.x - d.radius - 2) < rect[0]) d.speedX = Math.abs(d.speedX);
        if ((d.x + d.radius + 2) > rect[2]) d.speedX = -1 * Math.abs(d.speedX);
        if ((d.y - d.radius - 2) < rect[1]) d.speedY = -1 * Math.abs(d.speedY);
        if ((d.y + d.radius + 2) > rect[3]) d.speedY = Math.abs(d.speedY);

        d.x = d.x + (d.speedX * alpha);
        d.y = d.y + (-1 * d.speedY * alpha);

        };
      }
      function collide(alpha) {
        var quadtree = d3.quadtree(nodes);
        return function(d) {
          var r = d.radius + radius.domain()[1] + padding,
          nx1 = d.x - r,
          nx2 = d.x + r,
          ny1 = d.y - r,
          ny2 = d.y + r;
          quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
            if (l < r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2
        || x2 < nx1
        || y1 > ny2
        || y2 < ny1;
        });
        };
      };
      circle
      .each(gravity(0.1))
      .each(collide(.5))
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
      }

  }
  // Move nodes toward cluster focus.

  render() {
    return (
      <LineWrapper>
        <Paper
          onMouseOver={() => this.handleHover(true)}
          onMouseOut={() => this.handleHover(false)}
          style={{ height: 250, width: 309, display: 'inline-block'}}>
          <div className="container-blog" style={{ height: 250}}>
          </div>
        </Paper>
      </LineWrapper>
    )
}
}
export default BlogCard2
