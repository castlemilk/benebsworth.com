import React from 'react'

import HeaderCardDisplay from './HeaderCardDisplay';
const items = ["dog", "cat", "mouse", "deni"]
const MainPage = (props) => (
  <div>
    <HeaderCardDisplay items={items} />
  </div>
)

export default MainPage
