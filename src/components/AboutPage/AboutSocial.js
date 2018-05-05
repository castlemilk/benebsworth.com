import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';
import { Motion, spring } from 'react-motion';
import { FaFacebookOfficial, FaTwitterSquare, FaInstagram, FaLinkedinSquare } from 'react-icons/lib/fa';
import { ThemeProvider } from 'styled-components';

const AboutSocialWrapper = styled.div`
    float: left;
    background-color: #ccc9c9;
    height: 100%;
    width: 100%;
    .social-media-box {
        text-align: center;
        float: left;
        background-color: #ccc9c9;
        height: 100%;
        width: 100%;

    }
    .social-header span{
        font-size: 30px;
        font-family: 'Days One';
        margin-left: 10px;
    }
`
const height = 121;
const fontSize = 50;
const AboutSocial = (props) => {
    const getSpringProps = () => {
        return {
          style:{
            width: spring(props.isSelected ? 30 : 50, {stiffness: 170, damping: props.isSelected ? 26 : 29, precision: 0.1}),
          },
        };
      }
    const socialView = (
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
    return (  
        <Motion {...getSpringProps()}>
            {
            tweenCollection => {
                return (
                <div style={{ width: `${tweenCollection.width}%` , float: 'left'}}>
                    <ThemeProvider theme={{ width: tweenCollection.width }} >
                        {socialView}
                    </ThemeProvider>
                </div>
                )
            }
            }
        </Motion>)
}

export default AboutSocial
