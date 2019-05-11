import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'
import { OutboundLink } from 'gatsby-plugin-google-analytics'
// import Paper from '@material-ui/core/Paper'
import Skills from './../Skills'

const StyledLink = styled(Link)`
  color: black;
`
const Image = styled.img`
  margin: 0;
  padding: 10px;
`
const Paper = styled.div`
  -webkit-box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  -moz-box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  border: solid 1px black;
  width: 100%;
  display: inline-flex;
  justify-content: center;
  text-align: center;
`
const ProjectRowWrapper = styled.div`
  display: grid;
  grid-template-areas: 'icon content';
  grid-template-columns: 100px 1fr;
  width: 100%;
`
const ProjectIcon = styled.div`
  grid-area: icon;
  margin: 5px;
  float: left;
  display: flex;
  height: 100%;
  width: 100%;
  align-self: center;
  align-items: center;
  justify-content: center;
`
const ProjectContent = styled.div`
  grid-area: content;
  display: grid;
  grid-template-areas:
    'header'
    'subtitle'
    'technology-header'
    'technologies-content';
  grid-template-rows: 40px 55px 20px;
`
const ProjectHeader = styled.div`
  grid-area: header;
  text-align: left;
  font-size: 2em;
`
const ProjectSubtitle = styled.div`
  grid-area: subtitle;
  /* Extra small devices (phones, 600px and down) */
  font-size: 20px;
  @media only screen and (max-width: 700px) {
    font-size: 3vw;
  }
  font-family: 'Prompt';
  width: 100%;
  margin-left: 30px;
  text-align: left;
  align-content: top;
  font-style: italic;
  padding-right: 30px;
`
const ProjectTechnologyHeader = styled.div`
  grid-area: technology-header;
  text-align: left;
  margin-left: 10px;
  font-weight: bold;
  font-size: 1.2em;
`
const ProjectTechnologyContent = styled.div`
  grid-area: technology-content;
  grid-column: 1;
  align-content: left;
`
const Wrapper = styled.div`
  margin-bottom: 10px;
  color: black;
  text-decoration: none;
  a {
    color: black;
    text-decoration: none;
  }
`
const SkillsHeader = styled.div`
  font-family: 'Prompt';
  margin-left: 10px;
`

const ProjectCard = props => {
  const cardView = (
    <Paper>
      <ProjectRowWrapper>
        <ProjectIcon>
          <Image src={props.image} />
        </ProjectIcon>
        <ProjectContent>
          <ProjectHeader>{props.title}</ProjectHeader>
          <ProjectSubtitle>{props.description}</ProjectSubtitle>
          <ProjectTechnologyHeader>Technologies</ProjectTechnologyHeader>
          <ProjectTechnologyContent>
            <Skills skills={props.technologies} />
          </ProjectTechnologyContent>
        </ProjectContent>
      </ProjectRowWrapper>
    </Paper>
  )
  return props.path.url ? (
    <Wrapper>
      <OutboundLink href={props.path.url}>{cardView}</OutboundLink>
    </Wrapper>
  ) : (
    <Wrapper>
      <StyledLink to={props.path || '/'}>{cardView}</StyledLink>
    </Wrapper>
  )
}

export default ProjectCard
