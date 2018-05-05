import React from 'react'
import Paper from 'material-ui/Paper';
import styled from 'styled-components';
import MtSvgLines from 'react-mt-svg-lines';
import AboutPanel from './AboutPanel';
import AboutAnimation from './AboutAnimation';

const CardTitle = styled.div`
  z-index: 10;
  position: absolute;
  display: flex;
  flex-direction: column;
  text-align: center;
  justify-content: center;
  width: 309px;
  height: 250px;
  font-family: 'Days One';
  font-size: 30px;
`

class ProjectsCard extends React.Component {
  constructor() {
      super();
  }
  render() {
    return (
      <Paper
        style={{ height: 250, width: 309, display: 'inline-block'}}>
        <CardTitle>
            Projects
        </CardTitle>
      </Paper>
    )
}
}
export default ProjectsCard
