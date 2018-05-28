import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components';
import Grid from 'material-ui/Grid';
import Card from '../Card';
import AWSDeveloperAssociate from '../../assets/images/aws-developer-associate.png';
import AWSSolArchitectAssociate from '../../assets/images/aws-sol-architect-associate.png';
import AWSSysOpsAssociate from '../../assets/images/aws-sysops-associate.png';
import AWSHeaderBackground from '../../assets/images/aws-header-background.png';
const Wrapper = styled.div`
    margin-bottom: 20px;
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
            score: 96,
            headerBackground: AWSHeaderBackground,
        },
        {
            title: 'SysOps Administrator- Associate',
            image: AWSSysOpsAssociate,
            score: 92,
            headerBackground: AWSHeaderBackground,
        },
        {
            title: 'Solutions Architect - Associate',
            image: AWSSolArchitectAssociate,
            score: 95,
            headerBackground: AWSHeaderBackground,
        },

    ]
    return (<Wrapper>
        <CertificationHeader>
            Certifications
            </CertificationHeader>
        <Grid container style= {{ justifyContent: 'center' }} >
        {/* <div style={{ textAlign: 'center' }}> */}
        {
        certs.map ( props => (
            <Card key={props.title} {...props} />
        ))}
        {/* </div> */}
        </Grid>
        </Wrapper>)
}

export default AboutCertifications;