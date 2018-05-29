import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';
import Helmet from 'react-helmet';
import { Container } from 'styled-bootstrap-grid';
import styled from "styled-components"
import Link from 'gatsby-link'
import icon16 from '../../assets/images/favicon.png';
import HeaderName from '../HeaderName';
import AboutBody from './AboutBody';
import AboutTimeLine from './AboutTimeLine';
import AboutFooter from './AboutFooter';
import AboutCertifications from './AboutCertifications';


export class AboutPage extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            windowWidth: 1700
        }
        this.handleWindowSizeChange = this.handleWindowSizeChange.bind(this)
    }
      
      // make sure to remove the listener
      // when the component is not mounted anymore
    componentWillUnmount() {
        typeof window !== 'undefined' && window.removeEventListener('resize', this.handleWindowSizeChange);
    }
    componentDidMount() {
        typeof window !== 'undefined' && setTimeout(window.addEventListener('resize', this.handleWindowSizeChange));
    }
    handleWindowSizeChange() {
        typeof window !== 'undefined' && setTimeout(this.setState({ windowWidth: window.innerWidth }));
    };
    handleSelect(active) {
        this.setState({ isSelected: active})
    }


    render() {
        //TODO:  * Add Skills summary view
        //TODO:  * Add Certification view

        const { windowWidth } = this.state;
        const isMobile = windowWidth <= 1000;
        const shrinkHeader = windowWidth <= 400;
        return (<div style={{
            margin: '0 auto',
            maxWidth: 960,
            padding: '0px 1.0875rem 1.45rem',
            paddingTop: 0,
        }}>
            <Helmet
                title='Ben Ebsworth [About]'
                meta={[
                  { name: 'description', content: 'Blog' },
                  { name: 'keywords', content: 'Blog, technology, software engineering' },
                ]}
               >
                <link rel="icon" type="image/png" href={`${icon16}`} sizes="16x16" />
              </Helmet>
                <Grid style={{ textAlign: 'center', width: '100%'}}>
                    <HeaderName size={ shrinkHeader ? 35 : 60} />
                </Grid>
                <Grid>
                    <AboutBody isMobile={isMobile}/>
                </Grid>
                <Grid>
                    <AboutTimeLine />
                </Grid>
                <Grid>
                    <AboutCertifications />
                </Grid>
                <Grid>
                    <AboutFooter isMobile={isMobile}/>
                </Grid> 
        </div>)
    }
}


export default AboutPage