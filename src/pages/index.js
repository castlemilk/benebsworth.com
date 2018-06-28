import React from 'react'
// import Link from 'gatsby-link'
import { withStyles } from '@material-ui/core/styles';
import withRoot from '../withRoot';
import Home from '../components/Home';

const styles = theme => ({
  root: {
    textAlign: 'center',
    paddingTop: theme.spacing.unit * 1,
  },
});

class HomePage extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    // const { classes } = this.props;
    return (
      <div >
        <Home />
      </div>)
  }
}

export default withRoot(withStyles(styles)(HomePage));
// export default HomePage;
