import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';
import styled from "styled-components";
import Helmet from 'react-helmet';
import icon16 from '../../assets/images/favicon.png';
import Dog from './tests/images/dog.png';

import { COLOR_SCHEME } from '../../config';
import ProjectList from './ProjectList';
import HeaderName from '../HeaderName';

const ProjectsWrapper = styled.div`
`

const projects = [
    {
        title: 'Nutry',
        description: 'Food Nutrients search & analytics platform',
        image: Dog,
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
        return (<div style={{
            margin: '0 auto',
            maxWidth: 960,
            padding: '0px 1.0875rem 1.45rem',
            paddingTop: 0,
        }}>
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