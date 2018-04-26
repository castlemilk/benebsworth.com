import React from 'react'
import Grid from 'material-ui/Grid';
import HeaderCardDisplay from './HeaderCardDisplay';
import HeaderName from './HeaderName';
const items = ["dog", "cat", "mouse"]
const MainPage = (props) => (
  <div>
    <Grid style={{ textAlign: 'center'}}>
      <HeaderName />
    </Grid>
    <Grid>
      <HeaderCardDisplay items={items} />
    </Grid>
  </div>
)

export default MainPage
