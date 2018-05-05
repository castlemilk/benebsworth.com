import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';
import { FaFacebookOfficial, FaTwitterSquare, FaInstagram, FaLinkedinSquare } from 'react-icons/lib/fa';

const AboutSocialWrapper = styled.div`
    height: 100%;
    width: 50%;
    float: left;
    background-color: #ccc9c9;
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
        <div className="social-header">
            <span>
            Social.
            </span>
           
        </div>
        <div className="social-media-box">
                <FaInstagram style={{ height, fontSize, color: '#000000' }} />
                <FaLinkedinSquare style={{height, fontSize, color: '#000000' }} />
                <FaTwitterSquare style={{height, fontSize, color: '#000000' }} />
                <FaFacebookOfficial style={{height, fontSize, color: '#000000' }} />
        </div>
    </AboutSocialWrapper>
)

export default AboutSocial
