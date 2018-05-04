import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';
import { FaFacebookOfficial, FaTwitterSquare, FaInstagram, FaLinkedinSquare } from 'react-icons/lib/fa';

const AboutSocialWrapper = styled.div`
    display: inline-block;
    height: 160px;
    width: 50%;
    float: left;
    .social-media-box {
        text-align: center;

    }
    .social-header span{
        font-size: 30px;
        font-family: 'Days One';
        margin-left: 10px;
    }
`
const height = 121;
const fontSize = 50;
const AboutSocial = (props) => (
    <AboutSocialWrapper>
        <Paper >
        <div className="social-header">
            <span>
            Social.
            </span>
           
        </div>
        <div className="social-media-box">
                <FaInstagram style={{ height, fontSize, color: '#7F3FBF' }} />
                <FaLinkedinSquare style={{height, fontSize, color: '#7F3FBF' }} />
                <FaTwitterSquare style={{height, fontSize, color: '#7F3FBF' }} />
                <FaFacebookOfficial style={{height, fontSize, color: '#7F3FBF' }} />
        </div>
        </Paper>
    </AboutSocialWrapper>
)

export default AboutSocial
