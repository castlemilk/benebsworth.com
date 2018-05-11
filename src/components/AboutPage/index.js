import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';
import styled from "styled-components"
import Link from 'gatsby-link'

import HeaderName from '../HeaderName';
import AboutBody from './AboutBody';
import AboutFooter from './AboutFooter';


export class AboutPage extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            windowWidth: window.innerWidth
        }
    }
    componentWillMount() {
        window.addEventListener('resize', this.handleWindowSizeChange);
      }
      
      // make sure to remove the listener
      // when the component is not mounted anymore
      componentWillUnmount() {
        window.removeEventListener('resize', this.handleWindowSizeChange);
      }
      
      handleWindowSizeChange = () => {
        this.setState({ windowWidth: window.innerWidth });
      };
    handleSelect(active) {
        this.setState({ isSelected: active})
    }

    render() {
        const { windowWidth } = this.state;
        const isMobile = windowWidth <=1000;
        const shrinkHeader = windowWidth <= 350;
        return (<Grid>
            <Grid style={{ textAlign: 'center'}}>
                
                <HeaderName size={ shrinkHeader ? 35 : 60} />
               
            </Grid>
            <Grid>
                <AboutBody isMobile={isMobile}/>
            </Grid>
            <Grid>
                <AboutFooter isMobile={isMobile}/>
            </Grid>     
        </Grid>)
    }
}


export default AboutPage