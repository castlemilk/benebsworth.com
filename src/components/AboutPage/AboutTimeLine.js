import { VerticalTimeline, VerticalTimelineElement }  from '../VerticleTimeline';
import { skills } from '../../config';
import Skills from '../Skills';
import DigioLogo from '../../assets/images/digio-logo.png';
import TelstraLogo from '../../assets/images/telstra-logo.png'
import MonashLogo from '../../assets/images/monash-logo.png';
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
      const digioLogoView = (
        <div style={{ display: 'flex', textAlign: 'center', height: '100%' }} >
          <img style={{ margin: 'auto'}}src={DigioLogo} />
        </div>
       )
       const telstraLogoView = (
        <div style={{ display: 'flex', textAlign: 'center', height: '100%' }} >
          <img style={{ margin: 'auto'}} src={TelstraLogo} />
        </div>
       )
       const monashLogoView = (
        <div style={{ display: 'flex', textAlign: 'center', height: '100%' }} >
          <img style={{ margin: 'auto'}} src={MonashLogo} />
        </div>
       )
        const content = (
            <VerticalTimeline animate={true} >
            <VerticalTimelineElement
              position="right"
              animate="true"
              className="vertical-timeline-element--work"
              date="April, 2018 - present"
              iconStyle={{ background: 'rgb(93, 41, 113)', color: '#fff' }}
              icon={digioLogoView}
            >
              <h3 className="vertical-timeline-element-title">DevOps Engineer</h3>
              <h4 className="vertical-timeline-element-subtitle">Melbourne, Australia</h4>
              <p>
                Building highly automated and robust platforms ontop of Kubernetes, Istio. Creating next-gen monitoring/observability capabilities
              </p>
              <Skills skills={skills[0]}/>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="left"
              animate="true"
              className="vertical-timeline-element--work"
              date="August, 2016 - 2018"
              iconStyle={{ background: 'rgb(255, 255, 255)', color: '#fff' }}
              icon={telstraLogoView}
            >
              <h3 className="vertical-timeline-element-title">DevOps/Full-Stack Engineer</h3>
              <h4 className="vertical-timeline-element-subtitle">Melbourne, Australia</h4>
              <p>
                Leading the build and development of small private cloud environment (4000 vCPU, 4 PB storage). 
                As well building the application layer ontop which carried out large-scale message ingestion (capable of over 300k EPS)
              </p>
              <Skills skills={skills[0]}/>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="right"
              animate="true"
              className="vertical-timeline-element--work"
              date="2008 - 2010"
              iconStyle={{ background: 'rgb(255, 255, 255)', color: '#fff' }}
              icon={telstraLogoView}
            >
              <h3 className="vertical-timeline-element-title">Graduate Engineer</h3>
              <h4 className="vertical-timeline-element-subtitle">Melbourne, Australia</h4>
              <p>
                Primarily working with networking/telecommunication technologies. 
                Experience with the typical networking vendors Cisco, Juniper, Palo Alto, Checkpoints and the respective CLI/GUI/Automation tooling.
                Additionally, responsible for building out a range of small automation tools using Python and the Python SSH library Paramiko.
              </p>
              <Skills skills={skills[0]}/>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="left"
              animate="true"
              className="vertical-timeline-element--education"
              date="November 2014"
              iconStyle={{ background: 'rgb(255, 255, 255)', color: '#fff' }}
              icon={monashLogoView}
            >
              <h2 className="vertical-timeline-element-header">Monash University</h2>
              <h3 className="vertical-timeline-element-title">Bachelor of Electrical and Computer System Engineering</h3>
              <p>
                Thorough cirriculum which provided students with a deep experimental and hands-on experience with the design, build and analysis of 
                complex real-time systems, imbedded electronics and analogue electronics. Additionally a foundational knowledge in computer science
              </p>
              <Skills skills={skills[0]}/>
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