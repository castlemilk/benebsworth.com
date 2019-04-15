import React from 'react'
import Link from 'gatsby-link'
import Grid from '@material-ui/core/Grid'
import styled from 'styled-components'

const CardWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
`
const CardImage = styled.div`
  position: absolute;
  z-index: 3;
  margin: auto;
  margin-top: 40px;
  margin-left: 62.5px;
`
const CardDescription = styled.div``
const Paper = styled.div`
  -webkit-box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  -moz-box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  box-shadow: 6px 7px 11px -5px rgba(138, 133, 138, 1);
  height: 250px;
  width: 250px;
  justify-content: center;
  text-align: center;
  margin-top: 5px;
  margin: 10px;
`
const Header = styled.div`
  height: 40%;
  width: 100%;
  background-color: #ffb44f;
  z-index: 2;
  
`
const Body = styled.div`
  height: 60%;
  width: 250px;
  background-color: white;
  z-index: 1;
  position: relative;
  font-weight: bold;
  font-size: 17px;
`
const Description = styled.div`
  padding-top: 70px;
  font-family: 'Prompt';
`
const ScoreBar = styled.div`
  border-radius: 10px;
  height: 20px;
  width: ${props => props.score}%;
  background-color: #febd61;
  color: black;
  text-align: center;
  display: flex;
  flex-direction: column;
  bottom: 0;
  position: absolute;
`
const ScoreBackground = styled.div`
  background: #939398;
  border-color: black;
  border-width: 2px;
  color: black;
  border-radius: 10px;
  width: 100%;
  height: 20px;
  bottom: 0;
  position: absolute;
  margin-bottom: 10px;
  text-align: center;
`
const ScoreValue = styled.div`
  z-index: 4;
  color: gray;
  font-family: 'Prompt';
  width: 100%;
  height: 20px;
  bottom: 0;
  position: absolute;
  text-align: center;
`
const ScoreWrapper = styled.div`
  width: 90%;
  margin-left: 5%;
  position: absolute;
  bottom: 0;
  margin-bottom: 5px;
`

const Card = props => (
  <Paper>
    <CardImage>
      <img src={props.image} />
    </CardImage>
    <Header>
      <img src={props.headerBackground} />
    </Header>

    <Body>
      <Description>{props.title}</Description>
      {/* { props.score ? <ScoreWrapper><ScoreBackground><ScoreBar score={props.score}  ></ScoreBar><ScoreValue>{props.score}%</ScoreValue></ScoreBackground></ScoreWrapper>: <div /> } */}
    </Body>
  </Paper>
)

export default Card
