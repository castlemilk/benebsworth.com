import React from 'react'
import PropTypes from 'prop-types';
import styled from 'styled-components';

const SkillsWrapper = styled.div`
display: flex;

`
const Skill = styled.div`
    border-radius: 10px;
    color: black;
    margin: 5px;
    padding-left: 10px;
    padding-right: 10px;
    background-color: ${props => props.color};
`
const Skills = (props) => (
    <SkillsWrapper>
    {props.skills.map((skill) =>
        <Skill color={skill.color}>
        {skill.text}
        </Skill>
    )}
    </SkillsWrapper>
)


export default Skills;