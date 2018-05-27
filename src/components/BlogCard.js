import React from 'react'
import styled from "styled-components"
import { spring } from 'react-motion';
import Paper from 'material-ui/Paper';

import * as d3 from "d3";

const BlogWrapper = styled.div`
  .paper-wrapper:hover {
    text-shadow: 2px 2px 5px #903fb9;
    font-size: 40px;
  }
`
const BlogTitle = styled.div`
  z-index: 10;
  position: absolute;
  display: flex;
  flex-direction: column;
  text-align: center;
  justify-content: center;
  width: 309px;
  height: 250px;
  font-family: 'Days One';
  font-size: 30px;
`
class BlogCard extends React.Component {

  constructor(props) {
      super(props);
      // this.props.getSpringProps = this.getSpringProps.bind(this)
      this.state = {
        margin: {top: 0, right: 0, bottom: 0, left: 0},
        width: 0,
        height: 0,
        rect: 0,
        n: 10,
        m: 3,
        padding: 6,
        maxSpeed: 100,
        radius: 0,
        color: null,
        svg: null,
        force: null,
        nodes: [],
        circle: null,
      }
      this.state.width = 309 - this.state.margin.left - this.state.margin.right;
      this.state.height = 250 - this.state.margin.top - this.state.margin.bottom;
      this.state.rect = [0,0, this.state.width - 0, this.state.height - 0];
      this.state.radius = d3.scaleSqrt().range([0, 8]);
      this.state.color = d3.scaleOrdinal(d3.schemeSet3).domain(d3.range(this.state.m));
      

  }
  initialise() {
    for (let i of d3.range(this.state.n) ){
      this.state.nodes.push({radius: this.state.radius(1 + Math.floor(Math.random() * 4)),
      color: this.state.color(Math.floor(Math.random() * this.state.m)),
      x: this.state.rect[0] + (Math.random() * (this.state.rect[2] - this.state.rect[0])),
      y: this.state.rect[1] + (Math.random() * (this.state.rect[3] - this.state.rect[1])),
      speedX: (Math.random() - 0.5) * 2 *this.state.maxSpeed,
      speedY: (Math.random() - 0.5) * 2 *this.state.maxSpeed});
    }
    this.generateAnimation()
  }
  generateAnimation() {
    this.generateObjects()
    this.state.force = d3.forceSimulation()
    .nodes(this.state.nodes)
    .on("tick", () => this.tick())
    .alpha(1)
    .alphaDecay(0.0001)
    .stop()
    
  }
  tick() {
    var { circle, rect, nodes, padding, radius } = this.state;
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
  componentDidMount() {
    setTimeout((() => this.initialise()));
  };
  startAnimation() {
    this.state.force.restart()
    d3.select(".container-blog").select("svg").selectAll("*").attr("opacity", 1)
  }
  stopAnimation() {
    this.state.force.stop();
    d3.select(".container-blog").select("svg").selectAll("*").attr("opacity", 0)
  }


  generateObjects() {
    this.state.svg = d3.select(".container-blog").append("svg")
      .attr("width", this.state.width + this.state.margin.left + this.state.margin.right)
      .attr("height", this.state.height + this.state.margin.top + this.state.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + this.state.margin.left + "," + this.state.margin.top + ")");
      this.state.circle = this.state.svg.selectAll("circle")
      .data(this.state.nodes)
      .enter().append("circle")
      .attr("r", function(d) { return d.radius; })
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .style("fill", function(d) { return d.color; })
    d3.select(".container-blog").select("svg").selectAll("*").attr("opacity", 0)
  }


  // Move nodes toward cluster focus.

  render() {
    return (
      <BlogWrapper>
        <div className="paper-wrapper"
          onMouseEnter={() => this.startAnimation()}
          onMouseLeave={() => this.stopAnimation()}
          style={{ height: 250, width: 309, display: 'inline-block', boxShadow: '10 10 8 #888888'}}>
          <div className="container-blog" style={{ height: 250, position: 'absolute'}}>
            <BlogTitle>
                Blog
            </BlogTitle>
          </div>
        </div>
      </BlogWrapper>
    )
}
}
export default BlogCard
