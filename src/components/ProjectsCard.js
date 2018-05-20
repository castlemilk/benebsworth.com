import React from 'react';
import ReactDOM from 'react-dom';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';
import MtSvgLines from 'react-mt-svg-lines';
import * as d3 from 'd3';

import { poissonDiscSampler, sample } from '../lib/utils';
import AboutPanel from './AboutPanel';
import AboutAnimation from './AboutAnimation';

const ProjectCardWrapper = styled.div`
  canvas {
    ${'' /* transform: translateY(-15px) translateX(-15px); */}
  }
  ${'' /* overflow: hidden; */}
`
const CardTitle = styled.div`
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

class ProjectsCard extends React.Component {
  constructor(props) {
      super(props);
  }
  startAnimation() {
    var height = 250;
    var width = 309;
    var pi = 2 * Math.PI;
    var gravity = 0.1;
    var sample = poissonDiscSampler(width+200, height+200, 20);
    var s;
    var canvas = d3.select('.project-card-container').append('canvas')
      .attr('width', width)
      .attr('height', height)
    var context = canvas.node().getContext("2d")
    var nodes = [{ x: 0, y: 0}]
    while (s = sample() ) nodes.push(s);
    console.log(nodes)
    var voronoi = d3.voronoi()
      .x(function (d) { return d.x })
      .y(function (d) { return d.y })
      // .size(width, height)
      // .extent([[-1, -1], [width +100, height +100 ]])
    var links = voronoi.links(nodes)

    var force = d3.forceSimulation()
      .nodes(nodes.slice())
      // .force('charge', d3.forceManyBody().strength(function () { return  -200 }))
      .force('charge', d3.forceManyBody().strength(function (d, i) { return i ? -30 : -350}))
      .on('tick', ticked)
      .alphaMin(0.2)
      .alphaTarget(0.2)
      .alpha(0.2)
    d3.select('.project-card-container')
      .on('touchmove mousemove', moved)
    function moved() {
      var p1 = d3.mouse(this)
      nodes[0].x = p1[0]
      nodes[0].y = p1[1]
      force.restart()
    };
    function ticked () {
      
      force.restart()
      
      for (var i = 0, n = nodes.length; i < n; ++i) {
        var node = nodes[i];
        node.y += (node.cy - node.y) * gravity;
        node.x += (node.cx - node.x) * gravity;
      }
      context.clearRect(0, 0, width, height);
  
      context.beginPath();
      for (var i = 0, n = links.length; i < n; ++i) {
        var link = links[i];
        context.moveTo(link.source.x, link.source.y);
        context.lineTo(link.target.x, link.target.y);
      }
      context.lineWidth = 1;
      context.strokeStyle = "#bbb";
      context.stroke();
  
      context.beginPath();
      for (var i = 0, n = nodes.length; i < n; ++i) {
        var node = nodes[i];
        context.moveTo(node.x, node.y);
        context.arc(node.x, node.y, 2, 0, pi);
      }
      context.lineWidth = 3;
      context.strokeStyle = "#fff";
      context.stroke();
      context.fillStyle = "#000";
      context.fill();
    };
    
  }
  
  
  
  componentDidMount() {
    this.startAnimation()
  };
  render() {
    
    return (
      <ProjectCardWrapper>
      <Paper
        style={{ height: 250, width: 309, display: 'inline-block'}}>
          <div className='project-card-container' >   
          <CardTitle>
            Projects
          </CardTitle>
        </div>
      </Paper>
      </ProjectCardWrapper>
    )
}
}
export default ProjectsCard
