import React from 'react'
import Link from 'gatsby-link'
import ProjectCard from './ProjectCard';

class ProjectList extends React.Component {
    constructor(props) {
        super(props)
    }
    render() {
        const items = this.props.items.map( projectProps => <ProjectCard key={projectProps.key || projectProps.title} {...projectProps} />)
        return (<div>
            {items}
        </div>
      )
    }
}
  

export default ProjectList
