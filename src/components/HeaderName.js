import React from 'react';
import ReactRevealText from 'react-reveal-text'
import styled from 'styled-components'
import Link from 'gatsby-link'
const StyledLink = styled(Link)`
  color: black;
  text-decoration: none;
  font-family: 'Days One';
  margin-bottom: 30
`;

class HeaderName extends React.Component {
    constructor(props) {
        super(props);
        this.state = { show: false };
    }
    componentDidMount() {
        this._ismounted = true;
        this.transitionTimeout = setTimeout(() => {
            if (this._ismounted) {
                this.setState({ show: true });
            }
        }, 1000);
    }
    componentWillUnmount() {
        clearTimeout(this.transitionTimeout);
    }
    render() {
        return <StyledLink to="/" size={this.props.size}><ReactRevealText style={{ fontSize: this.props.size || 60 }} show={this.state.show} >BEN EBSWORTH</ReactRevealText></StyledLink>
    }
}

export default HeaderName;
