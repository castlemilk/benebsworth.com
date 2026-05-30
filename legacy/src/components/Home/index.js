import React from 'react'
import Grid from '@material-ui/core/Grid'
import icon16 from '../../assets/images/favicon.png'
import Header from './../Header'
import HomeCardDisplay from './HomeCardDisplay'
import AboutCard from './../AboutCard'
import BlogCard from './../BlogCard'
import ProjectsCard from './../ProjectsCard'
import withRoot from '../../withRoot'

import { createGlobalStyle } from "styled-components"

const GlobalStyles = createGlobalStyle`

body {
  --bg: #fff;
  background: #fff !important; 
}
body .dark {
  background: #fff !important;
}
`

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
  constructor () {
    super()
    this.state = { loading: true }
  }

  componentWillMount () {
    this.setState({ loading: false })
  }
  render () {
    return this.state.loading ? (
      <div>loading</div>
    ) : (
      <div
        style={{
          margin: '0 auto',
          maxWidth: 1024
        }}
      >
        <GlobalStyles />
        <Grid style={{ textAlign: 'center' }}>
          <Header />
        </Grid>
        <Grid>
          <HomeCardDisplay items={items_advanced} />
        </Grid>
      </div>
    )
  }
}

export default withRoot(MainPage)
