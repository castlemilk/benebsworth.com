import React from 'react'
import Grid from 'material-ui/Grid';
import HeaderCardDisplay from './HeaderCardDisplay';
import HeaderName from './HeaderName';
import AboutCard from './AboutCard';
import AboutAnimation from './AboutAnimation';
import AboutPanel from './AboutPanel';
import BlogCard from './BlogCard';
import BlogCard2 from './BlogCard2';
const items = ["dog", "cat", "mouse"]
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
    component: <BlogCard2 />,
    path: '/blog'
  },
  {
    id: 3,
    title: 'Projects',
    isComponent: false,
    color: 'purple',
    path: '/projects'
  }
]
const MainPage = (props) => (
  <div>
    <Grid style={{ textAlign: 'center'}}>
      <HeaderName />
    </Grid>
    <Grid>
      <HeaderCardDisplay items={items_advanced} />
    </Grid>
  </div>
)

export default MainPage
