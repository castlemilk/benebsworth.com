import React from "react"
import styled from "styled-components"

const CardImage = styled.div`
  position: absolute;
  z-index: 3;
  margin: auto;
  margin-top: 40px;
  margin-left: 62.5px;
  border-radius: 10px 10px 0 0;
`
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
  border-radius: 10px;
`
const Header = styled.div`
  height: 40%;
  width: 100%;
  z-index: 2;
  border-radius: 10px 10px 0 0;
`
const Body = styled.div`
  height: 60%;
  width: 250px;
  background-color: white;
  z-index: 1;
  position: relative;
  font-weight: bold;
  font-size: 17px;
  border-radius: 0 0 10px 10px;
`
const Description = styled.div`
  padding-top: 70px;
  font-family: "Prompt";
`

const Card = props => (
  <Paper>
    <CardImage>
      <img src={props.image} />
    </CardImage>
    <Header>
      <img
        style={{ borderRadius: "10px 10px 0 0" }}
        src={props.headerBackground}
      />
    </Header>

    <Body>
      <Description>{props.title}</Description>
    </Body>
  </Paper>
)

export default Card
