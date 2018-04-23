import React from 'react'

import HeaderCardDisplay from './HeaderCardDisplay';
const items = ["dog", "cat", "mouse"]
const MainPage = (props) => (
  <div>
    <HeaderCardDisplay items={items} />
  </div>
)

export default MainPage
