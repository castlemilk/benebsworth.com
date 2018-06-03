import React from 'react';
import PropTypes from 'prop-types';
import Grid from '@material-ui/core/Grid';
import styled from "styled-components";
import Helmet from 'react-helmet';
import icon16 from '../../assets/images/favicon.png';
import Nutry from '../../assets/images/nutry.png';
import B from '../../assets/images/b-image.png';


import { COLOR_SCHEME } from '../../config';
import ProjectList from './ProjectList';
import HeaderName from '../HeaderName';

const ProjectsWrapper = styled.div`
`

const projects = [
    {
        title: 'Nutry',
        description: 'Food Nutrients search & analytics platform',
        image: Nutry,
        path: '/projects/nutry',
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
            },
            {
                text: 'Jest',
                color: COLOR_SCHEME.blue
            },
            {
                text: 'Jenkins',
                color: COLOR_SCHEME.gray
            }
        ],
    },
    {
        title: 'This Blog',
        description: 'Little personal website to experiment and learn web technologies',
        image: B,
        technologies: [
            {
                text: 'Gatsby',
                color: COLOR_SCHEME.purple
            },
            {
                text: 'React',
                color: COLOR_SCHEME.react
            },
            {
                text: 'Google Analytics',
                color: COLOR_SCHEME.blue
            },
            {
                text: 'SSR',
                color: COLOR_SCHEME.gray
            },
            {
                text: 'AWS',
                color: COLOR_SCHEME.orange
            },
        ],
    }
]

export class Projects extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (<div>
            <Helmet
                title='Ben Ebsworth [Projects]'
                meta={[
                  { name: 'description', content: 'Projects' },
                  { name: 'keywords', content: 'Blog, technology, software engineering' },
                ]}
               >
                <link rel="icon" type="image/png" href={`${icon16}`} sizes="16x16" />
              </Helmet>
            <ProjectsWrapper>
            <Grid style={{ textAlign: 'center'}}>
                <HeaderName />
            </Grid>
            <ProjectList items={projects} />
        </ProjectsWrapper>
        </div>)
    }
}


export default Projects;