import React from 'react'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { withStyles } from 'material-ui/styles';

import HeaderCard from './HeaderCard';

export const headerCards = [
    {
        key: 1,
        text: 'About',
        color: 'green',
        path: '/about',
    },
    {
        key: 2,
        text: 'Blog',
        color: 'blue',
        path: '/blog'
    },
    {
        key: 3,
        text: 'Projects',
        color: 'purple',
        path: '/projects'
    },
]
const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    height: 0,
    width: 0,
  },
  control: {
    padding: theme.spacing.unit * 2,
  },
});
const HeaderCardDisplay = (props) => {
  const plainCard = (key, text, color) => {
    return (<Paper key={key} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 250}} >
        <HeaderCard key={key} text={text} color={color} />
    </Paper>)
  }
  const cards =props.items.map(({ title, id, isComponent, component, color }) => (
    <Grid key={id} xs={12} sm={6} md={4} lg={4} item className={styles.paper} >
      { isComponent ? component : plainCard(id, title, color)}
  </Grid>
))
  return (
    <div style={{  textAlign: 'center' }} >
      <Grid container spacing={16}>
          {cards}
      </Grid>
    </div>
  )
}

export default HeaderCardDisplay
