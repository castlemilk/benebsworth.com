import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'
import Grid from '@material-ui/core/Grid'
import { OutboundLink } from 'gatsby-plugin-google-analytics'
import Card from './Card'
import AWSDeveloperAssociate from '../../assets/images/aws-developer-associate.png'
import AWSSolArchitectProfessional from '../../assets/images/aws-sol-architect-professional.png'
import AWSSolArchitectAssociate from '../../assets/images/aws-sol-architect-associate.png'
import AWSSysOpsAssociate from '../../assets/images/aws-sysops-associate.png'
import AWSHeaderBackground from '../../assets/images/aws-header-background.png'
import GCPHeaderBackground from '../../assets/images/gcp-header-background.png'
import GCPCloudArchitectProfessional from '../../assets/images/gcp-cloud-architect-professional.png'
import GCPCloudDeveloperProfessional from '../../assets/images/gcp-cloud-developer-professional.png'
import GCPDataEngineerProfessional from '../../assets/images/gcp-data-engineer-professional.png'
import KubernetesHeaderBackground from '../../assets/images/kubernetes-header-background.png'
import CKA from '../../assets/images/cka.png'
import CKAD from '../../assets/images/ckad.png'
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
`
const CertificationHeader = styled.div`
  font-family: Avenir Next, sans-serif;
  font-size: 35px;
  font-weight: bold;
`

const AboutCertifications = props => {
  const certs = [
    {
      title: 'Developer - Associate',
      image: AWSDeveloperAssociate,
      url:
        'https://www.certmetrics.com/amazon/public/badge.aspx?i=2&t=c&d=2018-04-05&ci=AWS00461528',
      score: 96,
      headerBackground: AWSHeaderBackground
    },
    {
      title: 'SysOps Administrator - Associate',
      image: AWSSysOpsAssociate,
      url:
        'https://www.certmetrics.com/amazon/public/badge.aspx?i=3&t=c&d=2018-04-16&ci=AWS00461528',
      score: 92,
      headerBackground: AWSHeaderBackground
    },
    {
      title: 'Solutions Architect - Associate',
      image: AWSSolArchitectAssociate,
      url:
        'https://www.certmetrics.com/amazon/public/badge.aspx?i=1&t=c&d=2018-03-27&ci=AWS00461528',
      score: 95,
      headerBackground: AWSHeaderBackground
    },
    {
      title: 'Solutions Architect - Professional',
      image: AWSSolArchitectProfessional,
      url:
        'https://www.certmetrics.com/amazon/public/badge.aspx?i=4&t=c&d=2018-07-23&ci=AWS00461528',
      score: 81,
      headerBackground: AWSHeaderBackground
    },
    {
      title: 'Cloud Architect - Professional',
      image: GCPCloudArchitectProfessional,
      url:
        'https://www.credential.net/n61f0yqq?key=90fc73583c37636afe695c1630616338274ef6de2af726f6f115b09fa8486aee',
      score: 100,
      headerBackground: GCPHeaderBackground
    },
    {
      title: 'Data Engineer - Professional',
      image: GCPDataEngineerProfessional,
      url:
        'https://www.credential.net/b0ggnqiq?key=c6bc1ec57d52e36b9bf1121bd038a0660f549001c0ce2afc0d9da751ddf6c530',
      score: 100,
      headerBackground: GCPHeaderBackground
    },
    {
      title: 'Cloud Developer - Professional',
      image: GCPCloudDeveloperProfessional,
      url:
        'https://www.credential.net/9pdnh3wk?key=6fa8092c877c293db755182f5ca1d0e465d0aa15e3c842d727390bb37843a5dc',
      score: 100,
      headerBackground: GCPHeaderBackground
    },
    {
      title: 'Certified Kubernetes Administrator',
      image: CKA,
      url: 'https://benebsworth.com/pdf/CKA_Certificate.pdf',
      score: 100,
      headerBackground: KubernetesHeaderBackground
    },
    {
      title: 'Certified Kubernetes Application Developer',
      image: CKAD,
      url: 'https://benebsworth.com/pdf/CKAD_Certificate.pdf',
      score: 100,
      headerBackground: KubernetesHeaderBackground
    }
  ]
  return (
    <Wrapper>
      <CertificationHeader>Certifications</CertificationHeader>
      <Grid container style={{ justifyContent: 'center' }}>
        {certs.map(props => (
          <StyledLink
            key={`item-${props.title}`}
            style={{ color: 'black', textDecoration: 'none' }}
            href={props.url}
          >
            <Card key={props.title} {...props} />
          </StyledLink>
        ))}
      </Grid>
    </Wrapper>
  )
}

export default AboutCertifications
