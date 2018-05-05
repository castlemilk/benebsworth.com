import React from 'react'
import Link from 'gatsby-link'
import { Motion, spring } from 'react-motion';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';
import TextField from 'material-ui/TextField';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles';
import createPalette from 'material-ui/styles/createPalette'
import white from 'material-ui/colors';
import { Input } from 'material-ui';
import { ThemeProvider } from 'styled-components';
const theme = createMuiTheme({
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
	},
});

const AboutContactWrapper = styled.div`
    height: 100%;
    width: 100%;
    float: right;
    background-color: black;
    .contact-header {
        background-color: black;
        width: '100%';
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


`
const styles = theme => ({
    textField: {
        marginTop: 10,
        marginLeft: 50,
        marginRight: theme.spacing.unit,
        width: '70%'
    },
  });
class AboutContact extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            subject: 'Message Subject',
            message: 'Message'

          };
    }
    handleChange = key => event => {
        this.setState({
          [key]: event.target.value,
        });
      };
      handleMessageChange = message => event => {
        this.setState({
          [message]: event.target.value,
        });
      };
    getSpringProps = () => {
        return {
          style: {
            width: spring(this.props.isSelected ? 70 : 50, {stiffness: 170, damping: this.props.isSelected ? 29 : 27, precision: 0.1}),
          },
        };
      }
    render() {
        console.log('AvoutContact:isSelected:',this.props.isSelected)
        const { classes } = this.props;
        const textFieldView = (
            <div className="contact-header" >
                                <span>
                                Contact.
                                </span><br />
                                <MuiThemeProvider theme={theme}>
                                    <TextField
                                    label="Subject"
                                    className={classes.textField}
                                    placeholder="Message Subject"
                                    value={this.state.subject}
                                    onChange={this.handleChange('subject')}
                                    margin="normal"
                                    />
                                </MuiThemeProvider><br />
                                <MuiThemeProvider theme={theme}>
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
                                </MuiThemeProvider><br />
                            </div>
        )
        return (
            <Motion {...this.getSpringProps()}>
            {
            tweenCollection => {
                return (
                <div style={{ width: `${tweenCollection.width}%`, float: 'right' }}>
                    <AboutContactWrapper onClick={() => this.props.handleSelect(true)} onMouseLeave={() =>this.props.handleSelect(false)} >
                        {textFieldView}
                    </AboutContactWrapper>
                </div>
                )}
            }
            </Motion>
        )
    }
}

export default withStyles(styles)(AboutContact)
