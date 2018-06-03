/**
*
* Footer
*
*/

import React from 'react';
// import PropTypes from 'prop-types';
// import styled from 'styled-components';
import { Row, Col } from 'styled-bootstrap-grid';
import Grid from 'material-ui/Grid';
// import { Row, Col } from 'antd';
import { FaFacebookOfficial, FaTwitterSquare, FaInstagram, FaLinkedinSquare } from 'react-icons/lib/fa';


import { FormattedMessage } from 'react-intl';
import messages from './messages';
import FooterWrapper from './FooterWrapper';

function Footer() {
  // const { Footer } = Layout;
  return (
    <FooterWrapper>
      <footer className="footer">
        <div className="footer-wrap" >
          <Row className="links" >
          <Grid key={'products-col'} xs={12} sm={12} md={4} lg={4} xl={4} item >
              <div className="footer-center">
                <h2>Products</h2>
                <div>
                  <FormattedMessage {...messages.search} />
                </div>
                <div>
                  <FormattedMessage {...messages.mobile} />
                </div>
                <div>
                  <FormattedMessage {...messages.web} />
                </div>
                <div>
                  <FormattedMessage {...messages.enterprise} />
                </div>
              </div>
            </Grid>
            <Grid key={'developers-col'} xs={12} sm={12} md={4} lg={4} xl={4} item >
              <div className="footer-center">
                <h2>Developers</h2>
                <div>
                  <FormattedMessage {...messages.discussion} />
                </div>
                <div>
                  <FormattedMessage {...messages.api_ref} />
                </div>
                <div>
                  <FormattedMessage {...messages.api_status} />
                </div>
                <div>
                  <FormattedMessage {...messages.documentation} />
                </div>
              </div>
            </Grid>
            <Grid key={'company-col'} xs={12} sm={12} md={4} lg={4} xl={4} item >
              <div className="footer-center">
                <h2>Company</h2>
                <div>
                    <FormattedMessage {...messages.about} />
                </div>
                <div>
                  <FormattedMessage {...messages.blog} />
                </div>
                <div>
                  <FormattedMessage {...messages.press} />
                </div>
                <div>
                  <FormattedMessage {...messages.customers} />
                </div>
                <div>
                  <FormattedMessage {...messages.privacyAndTerms} />
                </div>
              </div>
            </Grid>
          </Row>
          <Row className="media-row" type="flex" justify="center">
            <Col className="side-col" xl={12} lg={12} md={12} sm={12} xs={12}>
              <div className="line-left"></div>
            </Col>
            <Col className="media-center-column" xl={12} lg={12} md={12} sm={12} xs={12}>
              <div className="social-media-box">
                <FaInstagram style={{ fontSize: 55, color: '#7F3FBF' }} />
                <FaLinkedinSquare style={{ fontSize: 55, color: '#7F3FBF' }} />
                <FaTwitterSquare style={{ fontSize: 55, color: '#7F3FBF' }} />
                <FaFacebookOfficial style={{ fontSize: 55, color: '#7F3FBF' }} />
              </div>
            </Col>
            <Col className="side-col" xl={12} lg={12} md={12} sm={12} xs={12}>
              <div className="line-right"></div>
            </Col>
          </Row>
        </div>
      </footer>
    </FooterWrapper>
  );
}

Footer.propTypes = {

};

export default Footer;
