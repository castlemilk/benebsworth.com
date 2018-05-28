import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components';

const CardWrapper = styled.div`
`;
const CardImage = styled.div`
    position: absolute;
    z-index: 3;
    margin-top: 40px;
    margin-left: 5%;
    
`;
const CardDescription = styled.div`
`
const Paper = styled.div`
  -webkit-box-shadow: 6px 7px 11px -5px rgba(138,133,138,1);
  -moz-box-shadow: 6px 7px 11px -5px rgba(138,133,138,1);
  box-shadow: 6px 7px 11px -5px rgba(138,133,138,1);
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
`
const Description = styled.div`
    padding-top: 70px;
    font-family: 'Days One';
`
const ScoreBar = styled.div`
    border-radius: 10px;
    height: 20px;
    width: ${props => props.score}%;
    background-color: #f89b1d;
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
    font-family: 'Days One';
    width: 100%;
    height: 20px;
    bottom: 0;
    position: absolute;
    text-align: center;
`
const ScoreWrapper = styled.div`
    width: 100%;
`


const Card = (props) => (
    <CardWrapper>
        <Paper>
            <CardImage>
                <img src={props.image} />
            </CardImage>
            <Header>
                <img src={props.headerBackground} />
            </Header>
            
            <Body>
                <Description>
                    {props.title}
                </Description>
                { props.score ? <ScoreWrapper><ScoreBackground><ScoreBar score={props.score}  ></ScoreBar><ScoreValue>{props.score}%</ScoreValue></ScoreBackground></ScoreWrapper>: <div /> }
            </Body>
        </Paper>
    </CardWrapper>
)


export default Card;