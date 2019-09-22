import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'
import Grid from '@material-ui/core/Grid'
import { OutboundLink } from 'gatsby-plugin-google-analytics'
import ContainerCamp from '../../assets/images/container-camp.png'
import KubernetesMeetup from '../../assets/images/kubernetes-meetup.png'
import GoogleCloudSummit from '../../assets/images/google-cloud-summit.png'
const Wrapper = styled.div`
  margin-bottom: 20px;
  color: black;
  text-decoration: none;
  box-shadow: none;
  border: none;
`
const StyledLink = styled(OutboundLink)`
  text-decoration: none;
  box-shadow: none;
  width: 100%;
  margin: 10px;
`
const CertificationHeader = styled.div`
  font-family: Avenir Next, sans-serif;
  font-size: 35px;
  font-weight: bold;
`
const Card = styled.div`
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-areas:
    'image title'
    'image date'
    'image description';
  grid-template-columns: 128px 1fr;
  grid-template-rows: 30px 20px 1fr;
  grid-column-gap: 20px;
  grid-row-gap: 10px;
  -webkit-box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  -moz-box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  margin-top: 5px;
  border: solid 1px gray;
  
`;
const CardImageWrapper = styled.div`
  display: flex;
  grid-area: image;
  justify-content: center;
  align-self: center;
`;
const CardImage =styled.img`
  grid-area: image;
  height: 128px;
  width: 128px;
  margin: auto;
`;
const CardTitle = styled.div`
  grid-area: title;
  float: left;
  font-weight: bold;
  font-size: 25px;
`;
const CardDate = styled.div`
  grid-area: date;
  font-style: italic;
`;
const CardDescription = styled.div`
  grid-area: description;
  padding: 10px;

`;

const AboutSpeaking = props => {
  const events = [
    {
      title: 'Kubernetes Meetup',
      date: 'Melbourne, Australia - September 2018',
      description: `Describing the practical experiences and contextual relevance of Istio in enterprise environments. This talk describes the likely first Istio deployment in Australia that I was responsible for delivering to production`,
      image: KubernetesMeetup,
      url:
        'https://melbkubernetes.org/istion-in-the-real-world/',
    },
    {
      title: 'Google Cloud Summit',
      date: 'Sydney, Australia - September 2018',
      description: `Demonstrating Istio in action with a fullstack application and carrying out an example continuous delivery workflow via canary releases`,
      image: GoogleCloudSummit,
      url:
        'https://melbkubernetes.org/istion-in-the-real-world/',
    },
    {
      title: 'Container Camp',
      date: 'Sydney, Australia - July 2019',
      description: `Overview of current Kubernetes centric ecosystem of CI/CD tools, with a end-to-end practical example of implementing a feature rich workflow in Tekton`,
      image: ContainerCamp,
      url:
        'https://2019.container.camp/au/speakers/ben-ebsworth/',
    },
    {
      title: 'Kubernetes Meetup',
      date: 'Melbourne, Australia - August 2019',
      description: `Overview of Kubernetes ecosystem for enabling continuous delivery, with an example showing the local developer experience being promoted and pipelines to a "production" environment`,
      image: KubernetesMeetup,
      url:
        'https://www.meetup.com/Melbourne-Kubernetes-Meetup/events/263929562/',
    },
  ]
  return (
    <Wrapper>
      <CertificationHeader>Speaking</CertificationHeader>
      <Grid container style={{ justifyContent: 'center' }}>
        {events.map(props => (
          <StyledLink
            key={`item-${props.title}`}
            style={{ color: 'black', textDecoration: 'none' }}
            href={props.url}
          >
            <Card key={props.title}>
              <CardImageWrapper><CardImage src={props.image} /></CardImageWrapper>
              <CardTitle>{props.title}</CardTitle>
              <CardDate>{props.date}</CardDate>
              <CardDescription>{props.description}</CardDescription>
            </Card>
          </StyledLink>
        ))}
      </Grid>
    </Wrapper>
  )
}

export default AboutSpeaking
