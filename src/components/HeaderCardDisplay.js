import React from 'react'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { withStyles } from 'material-ui/styles';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    height: 140,
    width: 100,
  },
  control: {
    padding: theme.spacing.unit * 2,
  },
});

const HeaderCardDisplay = (props) => {
  const cards =["1", "2", "3", "4", "5", "6"].map(item => (
    <Grid xs={12} sm={6} md={4} lg={4} item className={styles.paper} spacing={4} >
      <Paper style={{ height: '250'}} key={item} >
        <div>
          {item}
        </div>
      </Paper>
  </Grid>
))
  return (
    <div style={{ width: '100%', textAlign: 'center' }} >
      <Grid container spacing={16}>
          {cards}
      </Grid>
    </div>

  )
}

export default HeaderCardDisplay
