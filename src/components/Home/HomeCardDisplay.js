import React from 'react'
import Grid from '@material-ui/core/Grid';
import styled from 'styled-components'
import Link from 'gatsby-link'
import withRoot from '../../withRoot';

const StyledLink = styled(Link)`
  color: black;
`;
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
    this.state = { loading: true }
  }
  componentWillMount() {
    this.setState({ loading: false})
  }
  render() {
    const plainCard = (key, text, color) => {
      return (<Paper key={key} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 274}} >
          {text}
      </Paper>)
    }
    const cards =this.state.loading ? [] : this.props.items.map(({ title, id, isComponent, component, color, path }) => (
      <Grid key={id || title} xs={12} sm={12} md={4} lg={4} xl={4} item >
        { isComponent ?
          <StyledLink to={path}>
            <div style={{ '-webkit-box-shadow': '6px 7px 11px -5px rgba(138,133,138,1)',
                          '-moz-box-shadow': '6px 7px 11px -5px rgba(138,133,138,1)',
                          'box-shadow': '6px 7px 11px -5px rgba(138,133,138,1)',
                          height: 274,
                          width: 309,
                          display: 'inline-flex',
                          justifyContent: 'center',
                          textAlign: 'center' }}
            >
              {component}
            </div>
          </StyledLink> : plainCard(id, title, color)}
    </Grid>
    ))
    return this.state.loading ? <div>loading</div> : (
      <div style={{  textAlign: 'center', marginTop: 30 }} >
        {/* <div style={{ display: 'flex', flexWrap: 'wrap', marginRight: 0, marginLeft: 0 }} > */}
        <Grid container direction='row'>
            {cards}
        </Grid>
      </div>
    )}
}

export default withRoot(HomeCardDisplay)