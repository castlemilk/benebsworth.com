import React from 'react'
import Link from 'gatsby-link'
import styled from "styled-components"
import { OutboundLink } from 'gatsby-plugin-google-analytics'
import Paper from '@material-ui/core/Paper';
import Skills from './../Skills';

const StyledLink = styled(Link)`
  color: black;
`;

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
    .project-card-subtitle {
        font-size: 15px;
        margin-left: 10px;
        margin-top: 0px;
        margin-bottom: 20px;
        font-family: 'Days One';
        text-align: left;
    }
`
const Wrapper = styled.div`
    margin-bottom: 10px;
    color:black;
    text-decoration: none;
    a {
        color:black;
        text-decoration: none;
    }
`
const SkillsHeader = styled.div`
font-family: 'Days One';
margin-left: 10px;
`

const ProjectCard = (props) => {
    const cardView = (
        <Paper>
            <ProjectWrapper>
            <div className='project-card-image' >
                <img src={props.image} />
            </div>
            <div className='project-text-wrapper' >
            <div className='project-card-title' >
                {props.title}
            </div>
            <div className='project-card-subtitle' >
                {props.description}
            </div>

            <div className='project-technologies' >
                <SkillsHeader>Technologies</SkillsHeader>
                <Skills skills={props.technologies} />
            </div>
            </div>
            
            </ProjectWrapper>
        </Paper>
    )
    return props.path.url ? (
        <Wrapper>
            <OutboundLink href={props.path.url} >
                {cardView}
            </OutboundLink>
        </Wrapper>
    ) : (
        <Wrapper>
            <StyledLink to={props.path || '/'}>
                {cardView}
            </StyledLink>
       </Wrapper>
    )
    
}

export default ProjectCard
