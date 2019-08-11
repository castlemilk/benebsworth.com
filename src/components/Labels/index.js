import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { labelColors, labelImages } from '../../config'
import { rhythm } from '../../utils/typography'

const LabelWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const Label = styled.div`
  border-radius: 6px;
  display: flex;
  color: white;
  font-weight: 500;
  font-family: 'Prompt';
  margin: 5px;
  margin-bottom: rhythm(1 / 8);
  padding-left: 10px;
  padding-right: 10px;
  background-color: ${props => props.color};
`
const LabelImage = styled.img`
  width: 28px;
  height: 28px;
  margin: 0;
`
const LabelText = styled.div`
`;
const Labels = props => (
  <LabelWrapper>
    {props.labels.map(label => (
      <Label color={labelColors[label]} key={label}>
         { label in labelImages ?  <LabelImage src={labelImages[label]} /> : null }
        <LabelText>{label}</LabelText>
      </Label>
    ))}
  </LabelWrapper>
)

export default Labels
