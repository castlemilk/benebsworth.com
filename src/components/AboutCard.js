import React from 'react'
import Paper from 'material-ui/Paper';
import AboutAnimation from './AboutAnimation';
import MtSvgLines from 'react-mt-svg-lines';
class AboutCard extends React.Component {
  constructor() {
      super();
  }
  render() {
    return (
      <Paper style={{ height: 250, width: 309}}>
        <AboutAnimation />
      </Paper>
    )
}
}
export default AboutCard
