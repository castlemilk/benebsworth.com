import React from 'react'
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { labelColors } from '../../config';
import { rhythm } from "../../utils/typography"

const LabelWrapper = styled.div`
display: flex;
flex-wrap: wrap;

`
const Label = styled.div`
    border-radius: 6px;
    color: white;
    font-weight: 500;
    font-family: 'Prompt';
    margin: 5px;
    margin-bottom: rhythm(1 / 8);
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