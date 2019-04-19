import { VerticalTimeline, VerticalTimelineElement }  from '../VerticalTimeline';
import { skills } from '../../config';
import Skills from './../Skills';
import DigioLogoLarge from '../../assets/images/digio-logo.png';
import DigioLogoSmall from '../../assets/images/digio-logo-small.png';
import TelstraLogo from '../../assets/images/telstra-logo.png'
import MonashLogo from '../../assets/images/monash-logo.png';
import FaAnchor from 'react-icons/lib/fa/anchor';
import styled from 'styled-components';


import React from 'react'

const Wrapper = styled.div`
  .title {
    font-family: Avenir Next, sans-serif;
    font-size: 40px;
    background: #e8e8e8;
    padding-left: 10px;
    font-weight: bold;
    color: black;
  }
  font-family: Avenir Next, sans-serif; 

`

class AboutTimeLine extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
      let digioLogoView;
      if (typeof window !== 'undefined') {
        digioLogoView = (
          <div style={{ display: 'flex', textAlign: 'center', height: '100%' }} >
            <img style={{ margin: 'auto'}} src={DigioLogoLarge} width={ window.innerWidth <= 400 ? "70%" : "100%" }/>
          </div>
         )
      } else {
        digioLogoView = (
          <div style={{ display: 'flex', textAlign: 'center', height: '100%' }} >
            <img style={{ margin: 'auto'}} src={DigioLogoLarge} width={"100%"}/>
          </div>
         )
      }
      
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
            <VerticalTimeline animate={true}>
            <VerticalTimelineElement
              position="left"
              animate="false"
              key={'item-5'}
              className="vertical-timeline-element--work"
              date="September, 2018 - present"
              iconStyle={{ background: 'rgb(93, 41, 113)', color: '#fff' }}
              icon={digioLogoView}
            >
              <h3 className="vertical-timeline-element-title">Senior DevOps/FullStack Engineer</h3>
              <h4 className="vertical-timeline-element-subtitle">Melbourne, Australia</h4>
              <p>
                Leading the development and deployment of a set of production grade platform components on GCP. Facilitating adoption and 
                consumption of the platform through a series of developer tooling and frameworks to streamline usage.
                Delivered first production-grade GKE/GCP based platform for one of Australia's biggest Banks.
              </p>
              <Skills skills={skills[0]}/>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="right"
              animate="true"
              key={'item-one'}
              className="vertical-timeline-element--work"
              date="April, 2018 - September, 2018"
              iconStyle={{ background: 'rgb(93, 41, 113)', color: '#fff' }}
              icon={digioLogoView}
            >
              <h3 className="vertical-timeline-element-title">DevOps/FullStack Engineer</h3>
              <h4 className="vertical-timeline-element-subtitle">Melbourne, Australia</h4>
              <p>
                Building highly automated and robust production grade platforms on-top of Kubernetes. Utilising service-mesh technologies such 
                as Istio to enable sophisticated service-mesh micoservice architectures.
                Additionally, enabling/creating next-generation monitoring/observability capabilities, CI/CD pipelines, and security practices.
                Lead the delivery of Australia's first Istio deployment into production
              </p>
              <Skills skills={skills[1]}/>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="left"
              animate="true"
              key={'item-two'}
              className="vertical-timeline-element--work"
              date="August, 2016 - April, 2018"
              iconStyle={{ background: 'rgb(255, 255, 255)', color: '#fff' }}
              icon={telstraLogoView}
            >
              <h3 className="vertical-timeline-element-title">DevOps/Full-Stack Engineer</h3>
              <h4 className="vertical-timeline-element-subtitle">Melbourne, Australia</h4>
              <p>
                Leading the build and development of small private cloud environment (4000 vCPU, 4 PB storage). 
                As well building the application layer on-top which carried out large-scale message ingestion and transformation (capable of over 300k EPS)
              </p>
              <Skills skills={skills[2]}/>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="right"
              animate="true"
              key={'item-three'}
              className="vertical-timeline-element--work"
              date="Febuary, 2015 - July, 2016"
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
              <Skills skills={skills[3]}/>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="left"
              animate="true"
              key={'item-four'}
              className="vertical-timeline-element--education"
              date="November, 2014"
              iconStyle={{ background: 'rgb(255, 255, 255)', color: '#fff' }}
              icon={monashLogoView}
            >
              <h2 className="vertical-timeline-element-header">Monash University</h2>
              <h3 className="vertical-timeline-element-title">Bachelor of Electrical and Computer System Engineering (Honours)</h3>
              <p>
                Thorough curriculum which provided students with a deep experimental and hands-on experience with the design, build and analysis of 
                complex real-time systems, imbedded electronics and analogue electronics. Additionally a foundational knowledge in computer science.
              </p>
              <Skills skills={skills[4]}/>
            </VerticalTimelineElement>
            <VerticalTimelineElement
              position="right"
              animate="true"
              key={'item-six'}
              className="vertical-timeline-element--education"
              date="2009 - 2013"
              iconStyle={{ background: 'rgb(255, 255, 255)', color: '#fff' }}
              icon={monashLogoView}
            >
              <h2 className="vertical-timeline-element-header">Monash University</h2>
              <h3 className="vertical-timeline-element-title">Bachelor of Science </h3>
              <h3 className="vertical-timeline-element-subtitle">Majoring in Applied Mathematics and Experimental Physics</h3>
              <p>
              In depth exposure to low-level scientific theories in physics such as quantum mechanics, particle physics, condensed matter and cosmology/astronomy
              My applied mathematics major was focused in statistical and computational analysis with a strong coverage of partial and ordinary differential equations
              Throughout the course a heavy emphasis was made on experimentation/laboratory work with extensive report writing and literature reviews.
              </p>
              <Skills skills={skills[5]}/>
            </VerticalTimelineElement>
          </VerticalTimeline>
        )
        return (
            <Wrapper>
            <div className='title'>
              Career
            </div>
                {content}
            
            </Wrapper>
        )
    }
}

export default AboutTimeLine;