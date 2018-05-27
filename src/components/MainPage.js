import React from 'react'
import Grid from 'material-ui/Grid';
import { Container, Row, Col } from 'styled-bootstrap-grid';
import HeaderCardDisplay from './HeaderCardDisplay';
import HeaderName from './HeaderName';
import AboutCard from './AboutCard';
import AboutAnimation from './AboutAnimation';
import AboutPanel from './AboutPanel';
import BlogCard from './BlogCard';
import ProjectsCard from './ProjectsCard';
const items = [{ title: "dog"}, { title: "cat"}, {title: "mouse"}]
const items_advanced = [
  {
    id: 1,
    title: 'About',
    isComponent: true,
    component: <AboutCard />,
    color: false,
    path: '/about'
  },
  {
    id: 2,
    title: 'Blog',
    isComponent: true,
    color: false,
    component: <BlogCard />,
    path: '/blog'
  },
  {
    id: 3,
    title: 'Projects',
    isComponent: true,
    component: <ProjectsCard />,
    path: '/projects'
  }
]
class MainPage extends React.Component {
  constructor() {
    super()
    this.state = { loading: true }
  }
  
  componentWillMount() {
    this.setState({ loading: false})
  }
  render() {
    return this.state.loading ? <div>loading</div> : (<div style={{
      margin: '0 auto',
      maxWidth: 960,
      padding: '0px 1.0875rem 1.45rem',
      paddingTop: 0,
  }} >
      <Container>
            <Grid style={{ textAlign: 'center'}}>
              <HeaderName />
            </Grid>
            <Grid >
              <HeaderCardDisplay items={items_advanced} />
            </Grid>
      </Container>
      {/* <Container>
            <Row>
              <div style={{ textAlign: 'center', width: '100%'}}>
              <HeaderName />
              </div>
            </Row>
            <Row >
            <div style={{ textAlign: 'center', width: '100%'}}>
              <HeaderCardDisplay items={items_advanced} />
            </div>
            </Row>
      </Container> */}
        </div>)}
}

export default MainPage
