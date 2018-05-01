import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';

import HeaderName from '../HeaderName';

export class AboutPage extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (<div>
            <Grid style={{ textAlign: 'center'}}>
                <HeaderName />
            </Grid>
            
        </div>)
    }
}


export default AboutPage