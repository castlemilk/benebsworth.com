import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components';
import Grid from '@material-ui/core/Grid';
import { OutboundLink } from 'gatsby-plugin-google-analytics'
import Card from './Card';
import AWSDeveloperAssociate from '../../assets/images/aws-developer-associate.png';
import AWSSolArchitectProfessional from '../../assets/images/aws-sol-architect-professional.png';
import AWSSolArchitectAssociate from '../../assets/images/aws-sol-architect-associate.png';
import AWSSysOpsAssociate from '../../assets/images/aws-sysops-associate.png';
import AWSHeaderBackground from '../../assets/images/aws-header-background.png';
const Wrapper = styled.div`
    margin-bottom: 20px;
    color:black;
    text-decoration: none;
`;
const CertificationHeader = styled.div`
    font-family: 'Days One';
    font-size:  35px;
`

const AboutCertifications = (props) => {
    const certs = [
        {
            title: 'Developer - Associate',
            image: AWSDeveloperAssociate,
            url: 'https://www.certmetrics.com/amazon/public/badge.aspx?i=2&t=c&d=2018-04-05&ci=AWS00461528',
            score: 96,
            headerBackground: AWSHeaderBackground,
        },
        {
            title: 'SysOps Administrator - Associate',
            image: AWSSysOpsAssociate,
            url: 'https://www.certmetrics.com/amazon/public/badge.aspx?i=3&t=c&d=2018-04-16&ci=AWS00461528',
            score: 92,
            headerBackground: AWSHeaderBackground,
        },
        {
            title: 'Solutions Architect - Associate',
            image: AWSSolArchitectAssociate,
            url: 'https://www.certmetrics.com/amazon/public/badge.aspx?i=1&t=c&d=2018-03-27&ci=AWS00461528',
            score: 95,
            headerBackground: AWSHeaderBackground,
        },
        {
            title: 'Solutions Architect - Professional',
            image: AWSSolArchitectProfessional,
            url: 'https://www.certmetrics.com/amazon/public/badge.aspx?i=4&t=c&d=2018-07-23&ci=AWS00461528',
            score: 81,
            headerBackground: AWSHeaderBackground
        }

    ]
    return (<Wrapper>
        <CertificationHeader>
            Certifications
            </CertificationHeader>
        <Grid container style= {{ justifyContent: 'center' }} >
        {/* <div style={{ textAlign: 'center' }}> */}
        {
        certs.map ( props => (
            <OutboundLink style={{ color: 'black', textDecoration:'none' }} href={props.url} >
                <Card key={props.title} {...props} />
            </OutboundLink>
        ))}
        {/* </div> */}
        </Grid>
        </Wrapper>)
}

export default AboutCertifications;