import React from 'react';
import ReactRevealText from 'react-reveal-text'
class HeaderName extends React.Component {
    constructor() {
        super();
        this.state = { show: false };
    }
    componentDidMount() {
        setTimeout(() => {
          this.setState({ show: true });
        }, 1000);
      }
    render() {
        const style = {
            fontFamily: 'Days One',
            marginBottom: '50'
        }
        return <ReactRevealText style={style} show={this.state.show} >BEN EBSWORTH</ReactRevealText>
    }
}

export default HeaderName