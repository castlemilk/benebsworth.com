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
  const cards = props.items.map(item => (
    <Grid xs={3} item className={styles.paper} spacing={12} >
      <Paper style={{ width: '250', height: '250', margin: '20'}} key={item} >
        <div>
          {item}
        </div>
      </Paper>
  </Grid>
))
  return (
    <Grid container spacing={16} >
        {cards}
    </Grid>

  )
}

export default HeaderCardDisplay
