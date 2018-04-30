import React from 'react'
import Grid from 'material-ui/Grid';
import HeaderCardDisplay from './HeaderCardDisplay';
import HeaderName from './HeaderName';
import AboutCard from './AboutCard';
import AboutAnimation from './AboutAnimation';
import AboutPanel from './AboutPanel';
import BlogCard from './BlogCard';
const items = ["dog", "cat", "mouse"]
const items_advanced = [
  {
    id: 1,
    title: 'About',
    isComponent: true,
    component: <AboutCard />,
    color: false
  },
  {
    id: 2,
    title: 'Blog',
    isComponent: true,
    color: false,
    component: <BlogCard />
  },
  {
    id: 3,
    title: 'Projects',
    isComponent: false,
    color: 'purple'
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
