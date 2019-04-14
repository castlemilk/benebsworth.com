import React from 'react'
import Grid from '@material-ui/core/Grid';
import styled from 'styled-components'
import Link from 'gatsby-link'
import withRoot from '../../withRoot';
import Transition from 'react-transition-group/Transition';

const StyledLink = styled(Link)`
  color: black;
  box-shadow: none;
  border: none;
  text-decoration: none !important;

`;

const CardWrapper = styled.div`
  transition: ${props => `${props.duration}ms ease-in-out`};
  transition-property: opacity, transform;
  transform: ${props => `translateY(${props.Ypos}px)`};
  opacity: ${props => props.opacity};
`

const durations={
  0: 500,
  1: 750,
  2: 1000
}

const transitionStyles = {
  entering: {opacity: 0, Ypos: 500},
  entered: {opacity: 1, Ypos: 0},
  exited: {opacity: 0},
};
const Paper = styled.div`
  -webkit-box-shadow: 6px 7px 11px -5px rgba(138,133,138,1);
  -moz-box-shadow: 6px 7px 11px -5px rgba(138,133,138,1);
  box-shadow: 6px 7px 11px -5px rgba(138,133,138,1);
  height: 274px;
  width: 309px;
  display: inline-flex;
  justify-content: center;
  text-align: center;
`
class HomeCardDisplay extends React.Component {
  constructor(props) {
    super(props)
    this.state = { inside: false }
  }
  toggleEnterState() {
    this.setState({inside: true});
  }
  componentDidMount() {
    this.toggleEnterState();
}
  render() {
    const plainCard = (key, text, color) => {
      return (<Paper key={key} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 274}} >
          {text}
      </Paper>)
    }
    const cards =this.state.loading ? [] : this.props.items.map(({ title, id, isComponent, component, color, path }, index) => (
      <Transition timeout={durations[index]} in appear>
                {state => {
                    return (
      <Grid key={id || title} xs={12} sm={12} md={4} lg={4} xl={4} item >
        { isComponent ?
          <CardWrapper duration={durations[index]} {...transitionStyles[state]} >
          <StyledLink to={path}>
            <div style={{ boxShadow: '6px 7px 11px -5px rgba(138,133,138,1)',
                          height: 274,
                          width: 309,
                          display: 'inline-flex',
                          justifyContent: 'center',
                          textAlign: 'center' }}
            >
              {component}
            </div>
          </StyledLink></CardWrapper> : plainCard(id, title, color)}
    </Grid>)}}
    </Transition>
    ))
    return (<div style={{  textAlign: 'center', marginTop: 30 }} >
        <Grid container direction='row'>
            {cards}
        </Grid>
      </div>)
  }
}

export default withRoot(HomeCardDisplay)
