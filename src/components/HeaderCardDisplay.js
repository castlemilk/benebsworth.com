import React from 'react'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { withStyles } from 'material-ui/styles';
import styled from "styled-components"
import Link from 'gatsby-link'
import HeaderCard from './HeaderCard';
const StyledLink = styled(Link)`
  color: black;
`;

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
  const cards =props.items.map(({ title, id, isComponent, component, color, path }) => (
    <Grid key={id} xs={12} sm={6} md={4} lg={4} item className={styles.paper} >
      { isComponent ? <StyledLink to={path}>{component}</StyledLink> : plainCard(id, title, color)}
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
