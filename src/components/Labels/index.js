import React from 'react'
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { labelColors } from '../../config';

const LabelWrapper = styled.div`
display: flex;
flex-wrap: wrap;

`
const Label = styled.div`
    border-radius: 10px;
    color: black;
    font-family: 'Open Sans';
    margin: 5px;
    padding-left: 10px;
    padding-right: 10px;
    background-color: ${props => props.color};
`
const Labels = (props) => (
    <LabelWrapper>
    {props.labels.map((label) =>
        <Label color={labelColors[label]} key={label}>
        {label}
        </Label>
    )}
    </LabelWrapper>
)


export default Labels;