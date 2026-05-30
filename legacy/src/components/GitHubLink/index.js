import React from 'react'
import styled from 'styled-components'
import GitHubLogo from '../../assets/images/github.png'
const GitHubLink = props => (
  <div
    style={{
      height: 45,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'

    }}
  >
    <img style={{ margin: 0, height: 42, width: 42 }} src={GitHubLogo} />
    <a style={{ marginLeft: 10 }} href={props.link}>{props.link}</a>
  </div>
)

export default GitHubLink
