import React from 'react'
import PropTypes from 'prop-types';
import styled from 'styled-components';

const SkillsWrapper = styled.div`
display: flex;
flex-wrap: wrap;

`
const Skill = styled.div`
    border-radius: 10px;
    color: white;
    font-family: 'Prompt';
    font-weight: 500;
    margin: 5px;
    padding-left: 10px;
    padding-right: 10px;
    background-color: ${props => props.color};
`
const Skills = (props) => (
    <SkillsWrapper>
    {props.skills.map((skill) =>
        <Skill color={skill.color} key={skill.text}>
        {skill.text}
        </Skill>
    )}
    </SkillsWrapper>
)


export default Skills;