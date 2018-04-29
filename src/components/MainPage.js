import React from 'react'
import Grid from 'material-ui/Grid';
import HeaderCardDisplay from './HeaderCardDisplay';
import HeaderName from './HeaderName';
import AboutCard from './AboutCard';
import AboutAnimation from './AboutAnimation';
import AboutPanel from './AboutPanel';
const items = ["dog", "cat", "mouse"]
const MainPage = (props) => (
  <div>
    <Grid style={{ textAlign: 'center'}}>
      <HeaderName />
    </Grid>
    <Grid>
      <HeaderCardDisplay items={items} />
    </Grid>
    <Grid>
      <AboutCard />
    </Grid>
      <AboutPanel />
  </div>
)

export default MainPage
