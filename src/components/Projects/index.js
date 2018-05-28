import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';
import styled from "styled-components"

import { COLOR_SCHEME } from '../../config';
import ProjectList from './ProjectList';
import HeaderName from '../HeaderName';

const ProjectsWrapper = styled.div`
`

const projects = [
    {
        title: 'Nutry',
        description: 'Food Nutrients search & analytics platform',
        technologies: [
            {
                text: 'Elasticsearch',
                color: COLOR_SCHEME.teal
            },
            {
                text: 'React',
                color: COLOR_SCHEME.react
            },
            {
                text: 'AWS',
                color: COLOR_SCHEME.orange
            },
            {
                text: 'Redux',
                color: COLOR_SCHEME.purple
            },
            {
                text: 'Redux-Sagas',
                color: COLOR_SCHEME.purple
            },
            {
                text: 'Firebase',
                color: COLOR_SCHEME.redpink
            }
        ],
    },
    {
        title: 'Nutry',
        description: 'Food Nutrients search & analytics platform',
        technologies: [
            {
                text: 'Elasticsearch',
                color: COLOR_SCHEME.teal
            },
            {
                text: 'React',
                color: COLOR_SCHEME.react
            },
            {
                text: 'AWS',
                color: COLOR_SCHEME.orange
            },
            {
                text: 'Redux',
                color: COLOR_SCHEME.purple
            },
            {
                text: 'Redux-Sagas',
                color: COLOR_SCHEME.purple
            },
            {
                text: 'Firebase',
                color: COLOR_SCHEME.redpink
            }
        ],
    }
]

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