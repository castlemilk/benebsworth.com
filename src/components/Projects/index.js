import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';
import styled from "styled-components"

import { projects } from './tests/fixtures'
import ProjectList from './ProjectList';
import HeaderName from '../HeaderName';

const ProjectsWrapper = styled.div`
`

export class Projects extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (<ProjectsWrapper>
            <Grid style={{ textAlign: 'center'}}>
                <HeaderName />
            </Grid>
            <ProjectList items={projects} />
        </ProjectsWrapper>)
    }
}


export default Projects;