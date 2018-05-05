


import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';
import TextField from 'material-ui/TextField';
import Button from 'material-ui/Button';
import Icon from 'material-ui/Icon';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles';
import createPalette from 'material-ui/styles/createPalette'
import white from 'material-ui/colors';
import { Input } from 'material-ui';
import { ThemeProvider } from 'styled-components';
import { Motion, spring } from 'react-motion';
import { FaFacebookOfficial, FaTwitterSquare, FaInstagram, FaLinkedinSquare } from 'react-icons/lib/fa';
import MdSend from 'react-icons/lib/md/send';

import AboutContact from './AboutContact';
import AboutSocial from './AboutSocial';
const textInputTheme = createMuiTheme({
    pallete: createPalette({
        primary: white,
        type: 'light',
        text: {
            primary: white
        }
    }),
	overrides: {
		MuiInput: {
            root: {
                color: 'white',
            },
            input: {
                color: 'white',
                '&:focus': {
                    color: 'white'
                },
            },
			focused: {
				color: 'white',
			},
			underline: {
				'&:after': {
					backgroundColor: 'white',
				},
			},
        },
        MuiInputLabel: {
            root: {
                color: 'white',
            }
        },
		MuiFormLabel: {
            root: {
                color: 'white',
                '&$focused': {
                    color: 'white'
                }
            },
			focused: {
				color: 'white',
            },
        },
        MuiButton: {
            root: {
                backgroundColor: 'white',
            },
            bottom: {
                marginTop: 30,
            },
            raisedPrimary: {
                backgroundColor: 'white',
                color: 'black',
                '&:hover': {
                    backgroundColor: '#309f72'
                }
            }
            
           
        }
	},
});
const styles = theme => ({
    textField: {
        marginTop: 10,
        marginLeft: 20,
        marginRight: theme.spacing.unit,
        width: '70%'
    },
    iconSmall: {
        fontSize: 20,
    },
    rightIcon: {
    marginLeft: theme.spacing.unit,
    },
    button: {
    margin: theme.spacing.unit,
    },
  });
const AboutFooterWrapper = styled.div`
    height: 200px;
    display: inline-block;
    width: 100%;
`
const AboutSocialWrapper = styled.div`
    float: left;
    background-color: #ccc9c9;
    height: 100%;
    width: 100%;
    .social-media-box {
        text-align: center;
        float: left;
        background-color: #ccc9c9;
        width: 100%;

    }
    .social-header span{
        font-size: 30px;
        font-family: 'Days One';
        margin-left: 10px;
    }
`
const AboutContactWrapper = styled.div`
    height: 100%;
    width: 100%;
    float: right;
    background-color: black;
    .contact-header {
        background-color: black;
        width: 100%;
        float: left;
    }
    .contact-header span {
        font-size: 30px;
        font-family: 'Days One';
        background-color: black;
        color: white;
        margin-left: 10px;
    }
    .contact-header p {
        font-size: 20px;
        font-family: 'Days One';
        background-color: black;
        color: white;
        margin-left: 25px;
        margin-top: 10px;
        margin-bottom: 10px;
    }
    button {
        margin-top: 50px;
        float: right;
    }


`
export class AboutFooter extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            isSelected: false,
            subject: 'Message Subject',
            message: 'Message'
        }
    }
    handleSelect(active) {
        this.setState({ isSelected: active})
    }
    handleChange = key => event => {
        this.setState({
          [key]: event.target.value,
        });
    };
    getSpringProps = () => {
        return {
          style: {
            socialWidth: spring(this.state.isSelected ? 30 : 50),
            contactWidth: spring(this.state.isSelected ? 70 : 50),
          },
          
        };
      }
    render() {
        const height = 121;
        const fontSize = 50;
        const { isSelected } = this.state;
        const { classes } = this.props;
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
        const contactView = (
            <AboutContactWrapper >
            <div className="contact-header" >
                <span>
                Contact.
                </span><br />
                
            </div>
            <MuiThemeProvider theme={textInputTheme}>
                    <TextField
                    label="Subject"
                    className={classes.textField}
                    placeholder="Message Subject"
                    value={this.state.subject}
                    onChange={this.handleChange('subject')}
                    margin="normal"
                    />
                </MuiThemeProvider><br />
                <MuiThemeProvider theme={textInputTheme}>
                    <TextField
                        className={classes.textField}
                        label="Message"
                        placeholder="Enter a message here"
                        multiline={true}
                        value={this.state.message}
                        onChange={this.handleChange('message')}
                        rows={2}
                        rowsMax={3}
                        fullWidth={true}
                        />
                </MuiThemeProvider>
                <MuiThemeProvider theme={textInputTheme}>
                    <Button className={classes.button} variant="raised" color="primary" >
                        Send
                        <MdSend style={{ marginLeft: 5, fontSize: 20}} />
                    </Button>
                </MuiThemeProvider>
                <br />
            </AboutContactWrapper>
        )
    
    return (
        <Motion {...this.getSpringProps()}>
            {
            tweenCollection => {
                return (
                <AboutFooterWrapper>
                    <div className="social-box"
                        style={{
                            height: '100%',
                            width: `${tweenCollection.socialWidth}%`,
                            float: 'left' }} 
                        >
                        {socialView}
                    </div>
                    <div className="contact-box"
                        style={{
                            height: '100%',
                            width: `${tweenCollection.contactWidth}%`,
                            float: 'right'}} 
                        onClick={() => this.handleSelect(true)}
                        onMouseLeave={() => this.handleSelect(false)} >
                        {contactView}
                    </div>
                </AboutFooterWrapper>
                )
            }
            }
        </Motion>
    )
    }
}

export default withStyles(styles)(AboutFooter)
