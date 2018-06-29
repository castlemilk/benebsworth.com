import React from 'react'
import Grid from '@material-ui/core/Grid';
// import styled from 'styled-components'
import Helmet from 'react-helmet'
import icon16 from '../../assets/images/favicon.png';
import Header from './../Header';
import HeaderCardDisplay from './HomeCardDisplay';
import AboutCard from './../AboutCard';
import BlogCard from './../BlogCard';
import ProjectsCard from './../ProjectsCard';

// const Container = styled.div`
//   margin: 0 auto;
//   max-width: 960px;
//   padding: 0px 1.0875rem 1.45rem;
//   padding-top: 0;
// `
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
      margin: "0 auto",
      maxWidth: 960,
      // padding: "0px 30px 30px",
      paddingTop: 0}}>
            <Helmet
                title='Ben Ebsworth'
                meta={[
                  { name: 'description', content: 'Blog' },
                  { name: 'keywords', content: 'Blog, technology, software engineering' },
                ]}
               >
                <link rel="icon" type="image/png" href={`${icon16}`} sizes="16x16" />
              </Helmet>
            <Grid style={{ textAlign: 'center'}}>
              <Header />
            </Grid>
            <Grid >
              <HeaderCardDisplay items={items_advanced} />
            </Grid>
      </div>)}
}

export default MainPage
