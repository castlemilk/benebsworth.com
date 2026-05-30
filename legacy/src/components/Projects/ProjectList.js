import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'
import ProjectCard from './ProjectCard'

const Wrapper = styled.div`
  margin: 20px;
`
class ProjectList extends React.Component {
  constructor (props) {
    super(props)
  }
  render () {
    const items = this.props.items.map(projectProps => (
      <ProjectCard
        key={projectProps.key || projectProps.title}
        {...projectProps}
      />
    ))
    return <Wrapper>{items}</Wrapper>
  }
}

export default ProjectList
