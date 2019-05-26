import React from 'react'
import styled from 'styled-components'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import { OutboundLink } from 'gatsby-plugin-google-analytics'
import { withStyles } from '@material-ui/core/styles'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
import createPalette from '@material-ui/core/styles/createPalette'
import CircularProgress from '@material-ui/core/CircularProgress'
import white from '@material-ui/core/colors'
import { Motion, spring } from 'react-motion'
import FaFacebookOfficial from 'react-icons/lib/fa/facebook-official'
import FaGithubSquare from 'react-icons/lib/fa/github-square'
import FaTwitterSquare from 'react-icons/lib/fa/twitter-square'
import FaLinkedinSquare from 'react-icons/lib/fa/linkedin-square'
import MdSend from 'react-icons/lib/md/send'
import FaExclamationCircle from 'react-icons/lib/fa/exclamation-circle'
import firebase from './firebase'
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
        color: 'white'
      },
      input: {
        color: 'white',
        '&:focus': {
          color: 'white'
        }
      },
      focused: {
        color: 'white'
      },
      underline: {
        '&:after': {
          backgroundColor: 'white'
        }
      }
    },
    MuiInputLabel: {
      root: {
        color: 'white'
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
        color: 'white'
      }
    },
    MuiButton: {
      root: {
        backgroundColor: 'white'
      },

      raisedPrimary: {
        backgroundColor: 'white',
        color: 'black',
        '&:hover': {
          backgroundColor: '#309f72'
        }
      }
    }
  }
})
const buttonThemeValid = createMuiTheme({
  overrides: {
    MuiButton: {
      root: {
        backgroundColor: 'white'
      },

      raisedPrimary: {
        backgroundColor: 'white',
        color: 'black',
        '&:hover': {
          backgroundColor: '#309f72'
        }
      }
    }
  }
})
const buttonThemeInvalid = createMuiTheme({
  overrides: {
    MuiButton: {
      root: {
        backgroundColor: 'gray'
      },

      raisedPrimary: {
        backgroundColor: 'gray',
        color: 'black',
        '&:hover': {
          backgroundColor: '#309f72'
        }
      }
    }
  }
})
const styles = theme => ({
  textField: {
    marginTop: 10,
    marginLeft: 20,
    marginRight: theme.spacing.unit,
    width: '65%'
  },
  iconSmall: {
    fontSize: 20
  },
  rightIcon: {
    marginLeft: theme.spacing.unit
  },
  button: {
    margin: theme.spacing.unit
  },
  progress: {
    margin: theme.spacing.unit
  }
})
const AboutFooterWrapper = styled.div`
  margin-top: 20px;
  display: inline-block;
  width: 100%;
`
const AboutSocialWrapper = styled.div`
  float: left;
  background-color: #ccc9c9;
  height: ${props => props.height || 200}px;
  width: 100%;
  .social-media-box {
    text-align: center;
    background-color: #ccc9c9;
    width: 100%;
    display: flex;
    justify-content: center;
    align-content: center;
    text-decoration: none;
    .icon-github {
      text-decoration: none;
    }
    .icon-github:hover {
      color: #f7e2b0;
    }
    .icon-github a {
      color: inherit;
      text-decoration: none;
    }
    .icon-facebook:hover {
      color: #4267b2;
    }
    .icon-twitter:hover {
      color: #1ea1f2;
    }
    .icon-twitter a {
      color: inherit;
      text-decoration: none;
    }
    .icon-linkedin:hover {
      color: #0077b5;
    }
    .icon-linkedin a {
      color: inherit;
      text-decoration: none;
    }
  }
  .social-header span {
    font-size: 30px;
    font-family: Avenir Next, sans-serif;
    margin-left: 10px;
  }
`
const AboutContactWrapper = styled.div`
  height: ${props => (props.isMobile ? 275 : 200)}px;
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
    font-family: Avenir Next, sans-serif;
    background-color: black;
    color: white;
    margin-left: 10px;
  }
  .contact-header p {
    font-size: 20px;
    font-family: Avenir Next, sans-serif;
    background-color: black;
    color: white;
    margin-left: 25px;
    margin-top: 10px;
    margin-bottom: 10px;
  }
  button {
    margin-top: ${props => (props.isMobile ? 40 : 45)}px;
    margin-right: 10px;
    float: ${props => (props.isMobile ? 'left' : 'right')};
  }
`
const getSendIcon = state => {
  switch (state) {
    case LOADING:
      return (
        <CircularProgress
          size={20}
          className={{ root: { height: 20, width: 20 } }}
        />
      )
    case SUCCESS:
      return null
    case ERROR:
      return <FaExclamationCircle style={{ fontSize: 20 }} />
    case READY:
      return <MdSend style={{ fontSize: 20 }} />
  }
}
// STATES
const LOADING = 'LOADING'
const ERROR = 'ERROR'
const SUCCESS = 'SUCCESS'
const READY = 'READY'
export class AboutFooter extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      isSelected: false,
      isFocused: false,
      isBlured: true,
      loading: false,
      status: READY,
      subject: '',
      message: ''
    }
  }
  componentWillMount () {
    this.db = firebase.firestore()
  }
  componentWillUnmount () {
    clearInterval(this.progessCheckInterval)
  }
  handleChange (key, event) {
    this.setState({
      [key]: event.target.value
    })
  }
  handleSelect (active) {
    this.setState({ isSelected: active })
  }
  handleFocus () {
    this.setState({
      isFocused: true,
      isSelected: true
    })
  }
  handleBlur (blurred) {
    this.setState({
      isBlured: blurred,
      isFocused: false
    })
  }
  handleMouseLeave () {
    this.setState({
      isSelected: !!this.state.isFocused
    })
  }
  progressCheck () {
    this.setState({ progress: this.state.progress + 10 })
  }
  handleSubmit () {
    console.log('submitting')
    this.setState({ loading: true, status: LOADING })
    this.progessCheckInterval = setInterval(() => this.progressCheck(), 300)
    this.db
      .collection('messages')
      .add({
        subject: this.state.subject,
        message: this.state.message
      })
      .then(docRef => {
        console.log('Document written with ID: ', docRef.id)
        setTimeout(
          () => this.setState({ loading: false, status: SUCCESS }),
          300
        )
        clearInterval(this.progessCheckInterval)
      })
      .catch(error => {
        console.error('Error adding document: ', error)
        this.setState({ loading: false, status: ERROR })
        clearInterval(this.progessCheckInterval)
      })
  }
  getSpringProps () {
    return {
      style: {
        socialWidth: spring(this.state.isSelected ? 30 : 50),
        contactWidth: spring(this.state.isSelected ? 70 : 50)
      }
    }
  }
  contactValid () {
    return this.state.subject != '' && this.state.message != ''
  }

  render () {
    const height = 121
    const fontSize = 50

    const { classes, isMobile } = this.props
    const socialView = (
      <AboutSocialWrapper>
        <div className='social-header'>
          <span>Social.</span>
        </div>
        <div className='social-media-box'>
          <div className='icon-github'>
            <OutboundLink href='https://github.com/castlemilk'>
              <FaGithubSquare style={{ height, fontSize }} />
            </OutboundLink>
          </div>
          <div className='icon-linkedin'>
            <OutboundLink href='https://www.linkedin.com/in/ben-ebsworth/'>
              <FaLinkedinSquare style={{ height, fontSize }} />
            </OutboundLink>
          </div>
          <div className='icon-twitter'>
            <OutboundLink href='https://twitter.com/sycli?lang=en'>
              <FaTwitterSquare style={{ height, fontSize }} />
            </OutboundLink>
          </div>
          <div className='icon-facebook'>
            <FaFacebookOfficial style={{ height, fontSize }} />
          </div>
        </div>
      </AboutSocialWrapper>
    )
    const contactView = (
      <AboutContactWrapper isMobile={this.props.isMobile}>
        <div className='contact-header'>
          <span>Contact.</span>
          <br />
        </div>
        {this.state.status === SUCCESS ? (
          <div
            style={{
              display: 'flex',
              color: 'white',
              justifyContent: 'center',
              alignItems: 'center',
              width: '84%',
              height: '70%',
              fontSize: 20,
              textAlign: 'center',
              margin: 30
            }}
          >
            🎉 Thanks for getting in touch, I look forward to reading your message. 😀
          </div>
        ) : (
          <div>
            <MuiThemeProvider theme={textInputTheme}>
              <TextField
                label='Subject'
                className={classes.textField}
                placeholder='Message Subject'
                value={this.state.subject}
                onChange={event => this.handleChange('subject', event)}
                onFocus={() => this.handleFocus(true)}
                onBlur={() => this.handleBlur(true)}
                margin='normal'
              />
            </MuiThemeProvider>
            <br />
            <MuiThemeProvider theme={textInputTheme}>
              <TextField
                className={classes.textField}
                label='Message'
                placeholder='Enter a message here'
                multiline
                value={this.state.message}
                onChange={event => this.handleChange('message', event)}
                onFocus={() => this.handleFocus(true)}
                onBlur={() => this.handleBlur(true)}
                rows={2}
                rowsMax={3}
                fullWidth
              />
            </MuiThemeProvider>
            <MuiThemeProvider
              theme={
                this.contactValid() ? buttonThemeValid : buttonThemeInvalid
              }
            >
              <Button
                className={classes.button}
                variant='raised'
                color='primary'
                onClick={() => this.handleSubmit()}
              >
                <p style={{ marginBottom: 0, marginLeft: 5, marginRight: 10 }}>
                  Send
                </p>
                {getSendIcon(this.state.status)}
              </Button>
            </MuiThemeProvider>
            <br />
          </div>
        )}
      </AboutContactWrapper>
    )
    const styles = this.getSpringProps()
    const desktopView = (
      <Motion {...styles}>
        {tweenCollection => {
          return (
            <AboutFooterWrapper>
              <div
                className='social-box'
                style={{
                  height: '100%',
                  width: `${tweenCollection.socialWidth}%`,
                  float: 'left'
                }}
              >
                {socialView}
              </div>
              <div
                className='contact-box'
                style={{
                  height: '100%',
                  width: `${tweenCollection.contactWidth}%`,
                  float: 'right'
                }}
                onClick={() => this.handleSelect(true)}
                onMouseEnter={() => this.handleSelect(true)}
                onMouseLeave={() => this.handleMouseLeave()}
              >
                {contactView}
              </div>
            </AboutFooterWrapper>
          )
        }}
      </Motion>
    )
    const mobileView = (
      <AboutFooterWrapper>
        <div
          className='social-box'
          style={{
            height: '100%',
            width: '100%'
          }}
        >
          {socialView}
        </div>
        <div
          className='contact-box'
          style={{
            height: '100%',
            width: '100%'
          }}
        >
          <AboutContactWrapper isMobile={isMobile}>
            <div className='contact-header'>
              <span>Contact.</span>
              <br />
            </div>
            {this.state.status === SUCCESS ? (
              <div
              style={{
                display: 'flex',
                color: 'white',
                justifyContent: 'center',
                alignItems: 'center',
                width: '84%',
                height: '70%',
                fontSize: 20,
                textAlign: 'center',
                margin: 30
              }}
            >
              🎉 Thanks for getting in touch, I look forward to reading your message. 😀
            </div>
            ) : (
              <div>
                <MuiThemeProvider theme={textInputTheme}>
                  <TextField
                    label='Subject'
                    className={classes.textField}
                    placeholder='Message Subject'
                    value={this.state.subject}
                    onChange={event => this.handleChange('subject', event)}
                    margin='normal'
                  />
                </MuiThemeProvider>
                <br />
                <MuiThemeProvider theme={textInputTheme}>
                  <TextField
                    className={classes.textField}
                    label='Message'
                    placeholder='Enter a message here'
                    multiline
                    value={this.state.message}
                    onChange={event => this.handleChange('message', event)}
                    rows={2}
                    rowsMax={3}
                    fullWidth
                  />
                </MuiThemeProvider>
                <br />
                <MuiThemeProvider
                  theme={
                    this.contactValid() ? buttonThemeValid : buttonThemeInvalid
                  }
                >
                  <Button
                    className={classes.button}
                    variant='raised'
                    color='primary'
                    onClick={() => this.handleSubmit()}
                  >
                    Send
                    {getSendIcon(this.state.status)}
                  </Button>
                </MuiThemeProvider>
              </div>
            )}
          </AboutContactWrapper>
        </div>
      </AboutFooterWrapper>
    )

    return <div>{isMobile ? mobileView : desktopView}</div>
  }
}

export default withStyles(styles)(AboutFooter)
