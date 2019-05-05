import React from 'react'
import styled from 'styled-components'
import { select, mouse} from 'd3-selection'
import { voronoi } from 'd3-voronoi'
import { forceSimulation, forceManyBody } from 'd3-force'

import { poissonDiscSampler } from '../../lib/utils'

const CardTitle = styled.div`
  z-index: 10;
  position: absolute;
  display: flex;
  flex-direction: column;
  text-align: center;
  justify-content: center;
  width: 309px;
  height: 274px;
  font-family: 'Prompt';
  font-size: 30px;
  font-weight: bold;
`

class ProjectsCard extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      height: 274,
      width: 309,
      pi: 2 * Math.PI,
      gravity: 0.1,
      radius: 25,
      sample: [],
      s: null,
      nodes: [],
      context: null,
      voronois: null,
      force: null,
      links: null
    }
  }
  startAnimation () {
    this.state.sample = poissonDiscSampler(
      this.state.width,
      this.state.height,
      this.state.radius
    )
    this.state.canvas = select('.project-card-container')
      .append('canvas')
      .attr('width', this.state.width)
      .attr('height', this.state.height)
    this.state.context = this.state.canvas.node().getContext('2d')
    this.state.nodes = [{ x: 0, y: 0 }]
    while ((this.state.s = this.state.sample())) {
      this.state.nodes.push(this.state.s)
    }
    this.state.voronois = voronoi()
      .x(function (d) {
        return d.x
      })
      .y(function (d) {
        return d.y
      })
    this.state.links = this.state.voronois.links(this.state.nodes)

    // TODO: apply -30 charge force on force initialize and keep it active
    this.state.force = forceSimulation()
      .nodes(this.state.nodes.slice())
      .force(
        'charge',
        forceManyBody().strength(function (d, i) {
          return i ? -30 : -350
        })
      )
      .on('tick', () => this.ticked())
      .alphaMin(0.2)
      .alphaTarget(0.2)
      .alpha(0.2)
    var nodes = this.state.nodes
    var force = this.state.force
    select('.project-card-container').on('mousemove', function () {
      var p1 = mouse(this)
      nodes[0].x = p1[0]
      nodes[0].y = p1[1]
      force.restart()
    })
  }

  ticked () {
    this.state.force.restart()

    for (var i = 0, n = this.state.nodes.length; i < n; ++i) {
      var node = this.state.nodes[i]
      node.y += (node.cy - node.y) * this.state.gravity
      node.x += (node.cx - node.x) * this.state.gravity
    }
    this.state.context.clearRect(0, 0, this.state.width, this.state.height)

    this.state.context.beginPath()
    for (var i = 0, n = this.state.links.length; i < n; ++i) {
      var link = this.state.links[i]
      this.state.context.moveTo(link.source.x, link.source.y)
      this.state.context.lineTo(link.target.x, link.target.y)
    }
    this.state.context.lineWidth = 1
    this.state.context.strokeStyle = '#bbb'
    this.state.context.stroke()

    this.state.context.beginPath()
    for (var i = 0, n = this.state.nodes.length; i < n; ++i) {
      var node = this.state.nodes[i]
      this.state.context.moveTo(node.x, node.y)
      this.state.context.arc(node.x, node.y, 2, 0, this.state.pi)
    }
    this.state.context.lineWidth = 2
    this.state.context.strokeStyle = '#fff'
    this.state.context.stroke()
    this.state.context.fillStyle = '#000'
    this.state.context.fill()
  }

  componentDidMount () {
    setTimeout(this.startAnimation())
  }
  render () {
    return (
      <div style={{ height: '92%', width: 309, display: 'inline-block' }}>
        <div className='project-card-container'>
          <CardTitle>Projects</CardTitle>
        </div>
      </div>
    )
  }
}
export default ProjectsCard
