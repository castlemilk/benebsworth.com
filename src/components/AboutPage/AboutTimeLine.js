import { VerticalTimeline, VerticalTimelineElement }  from '../VerticleTimeline';
import FaAnchor from 'react-icons/lib/fa/anchor';
import styled from 'styled-components';

import React from 'react'

const Wrapper = styled.div`
`

class AboutTimeLine extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        const content = (
            <VerticalTimeline animate={true} >
            <VerticalTimelineElement
              position="right"
              animate="true"
              className="vertical-timeline-element--work"
              date="April, 2018 - present"
              iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
              icon={<FaAnchor style={{ fontSize: 10}} />}
            >
              <h3 className="vertical-timeline-element-title">Creative Director</h3>
              <h4 className="vertical-timeline-element-subtitle">Miami, FL</h4>
              <p>
                Creative Direction, User Experience, Visual Design, Project Management, Team Leading
              </p>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="left"
              animate="true"
              className="vertical-timeline-element--work"
              date="2010 - 2011"
              iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
              icon={<FaAnchor />}
            >
              <h3 className="vertical-timeline-element-title">Art Director</h3>
              <h4 className="vertical-timeline-element-subtitle">San Francisco, CA</h4>
              <p>
                Creative Direction, User Experience, Visual Design, SEO, Online Marketing
              </p>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="right"
              animate="true"
              className="vertical-timeline-element--work"
              date="2008 - 2010"
              iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
              icon={<FaAnchor />}
            >
              <h3 className="vertical-timeline-element-title">Web Designer</h3>
              <h4 className="vertical-timeline-element-subtitle">Los Angeles, CA</h4>
              <p>
                User Experience, Visual Design
              </p>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="left"
              animate="true"
              className="vertical-timeline-element--work"
              date="2006 - 2008"
              iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
              icon={<FaAnchor />}
            >
              <h3 className="vertical-timeline-element-title">Web Designer</h3>
              <h4 className="vertical-timeline-element-subtitle">San Francisco, CA</h4>
              <p>
                User Experience, Visual Design
              </p>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="right"
              animate="true"
              className="vertical-timeline-element--education"
              date="April 2013"
              iconStyle={{ background: 'rgb(233, 30, 99)', color: '#fff' }}
              icon={<FaAnchor />}
            >
              <h3 className="vertical-timeline-element-title">Content Marketing for Web, Mobile and Social Media</h3>
              <h4 className="vertical-timeline-element-subtitle">Online Course</h4>
              <p>
                Strategy, Social Media
              </p>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="left"
              animate="true"
              className="vertical-timeline-element--education"
              date="November 2012"
              iconStyle={{ background: 'rgb(233, 30, 99)', color: '#fff' }}
              icon={<FaAnchor />}
            >
              <h3 className="vertical-timeline-element-title">Agile Development Scrum Master</h3>
              <h4 className="vertical-timeline-element-subtitle">Certification</h4>
              <p>
                Creative Direction, User Experience, Visual Design
              </p>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="right"
              animate="true"
              className="vertical-timeline-element--education"
              date="2002 - 2006"
              iconStyle={{ background: 'rgb(233, 30, 99)', color: '#fff' }}
              icon={<FaAnchor />}
            >
              <h3 className="vertical-timeline-element-title">Bachelor of Science in Interactive Digital Media Visual Imaging</h3>
              <h4 className="vertical-timeline-element-subtitle">Bachelor Degree</h4>
              <p>
                Creative Direction, Visual Design
              </p>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="left"
              animate="true"
              className="vertical-timeline-element--education"
              date="2002 - 2006"
              iconStyle={{ background: 'rgb(233, 30, 99)', color: '#fff' }}
              icon={<FaAnchor />}
            >
              <h3 className="vertical-timeline-element-title">Bachelor of Science in Interactive Digital Media Visual Imaging</h3>
              <h4 className="vertical-timeline-element-subtitle">Bachelor Degree</h4>
              <p>
                Creative Direction, Visual Design
              </p>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="right"
              animate="true"
              className="vertical-timeline-element--education"
              date="2002 - 2006"
              iconStyle={{ background: 'rgb(233, 30, 99)', color: '#fff' }}
              icon={<FaAnchor />}
            >
              <h3 className="vertical-timeline-element-title">Bachelor of Science in Interactive Digital Media Visual Imaging</h3>
              <h4 className="vertical-timeline-element-subtitle">Bachelor Degree</h4>
              <p>
                Creative Direction, Visual Design
              </p>
            </VerticalTimelineElement>
          </VerticalTimeline>
        )
        return (
            <Wrapper>
                {content}
            </Wrapper>
        )
    }
}

export default AboutTimeLine;