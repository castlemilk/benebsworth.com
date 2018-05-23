import React from 'react'
import Link from 'gatsby-link'
import styled from "styled-components"
import Paper from 'material-ui/Paper';

const ProjectWrapper = styled.div`
display: inline-block;
width: 100%;
    .project-card-image {
        margin: 5px;
        float: left;
        display: flex;
    }
    .project-text-wrapper {
        display: inline-block;
        text-align: left;
    }
    .project-card-title {
        font-size: 30px;
        font-family: 'Days One';
        width: 100%;
        margin-left: 5px;
        text-align: left;
        align-content: top;
    }
    .project-card-description {
        font-size: 15px;
        margin-left: 10px;
        font-family: 'Days One';
        text-align: left;
    }
`
const Wrapper = styled.div`
margin-bottom: 10px;

`

const ProjectCard = ({ title, description, image }) => (
    <Wrapper>
        <Paper>
            <ProjectWrapper>
            <div className='project-card-image' >
                <img src={image} />
            </div>
            <div className='project-text-wrapper' >
            <div className='project-card-title' >
                {title}
            </div>
            <div className='project-card-description' >
                <p>{description}</p>
            </div>
            </div>
            </ProjectWrapper>
        </Paper>
    </Wrapper>
)

export default ProjectCard