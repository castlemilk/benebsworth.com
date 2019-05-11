import styled from 'styled-components'

const VerticalTimelineWrapper = styled.div`
  background-color: #e8e8e8;
  .vertical-timeline {
    width: 95%;
    max-width: 1170px;
    margin: 2em auto;
    margin-top: 0;
    margin-bottom: 0;
    position: relative;
    padding: 2em 0;
  }
  .vertical-timeline::after {
    /* clearfix */
    content: '';
    display: table;
    clear: both;
  }

  .vertical-timeline::before {
    /* this is the vertical line */
    content: '';
    position: absolute;
    top: 0;
    left: 18px;
    height: 100%;
    width: 4px;
    background: white;
  }

  @media only screen and (min-width: 1170px) {
    .vertical-timeline {
      margin-top: 0;
      margin-bottom: 1em;
      width: 90%;
    }
    .vertical-timeline:before {
      left: 50%;
      margin-left: -2px;
    }
  }
`

export default VerticalTimelineWrapper
