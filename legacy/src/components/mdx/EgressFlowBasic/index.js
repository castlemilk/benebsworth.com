import React, { useState, useEffect } from 'react'
import { Remarkable } from 'remarkable';

import {
  Wrapper,
  LabelWrapper,
  DiagramWrapper,
  DiagramLabel,
  BackgroundImageWrapper,
  DestinationRuleOneImageWrapper,
  ServiceEntryOneImageWrapper,
  ExternalImageWrapper
} from './style'

import BackgroundImage from '../../../assets/images/istio/egress-basic/background.svg'
import DestinationRuleOneImage from '../../../assets/images/istio/egress-basic/destinationrule-one.svg'
import ServiceEntryOne from '../../../assets/images/istio/egress-basic/serviceentry-one.svg'
import External from '../../../assets/images/istio/egress-basic/external.svg'


import {
  egressBasicMeta,
} from './messages'

const md = new Remarkable();
const Label = ({ label, active }) => (
  <LabelWrapper key={`label-${label.index}`} active={active}>
    <div className='header'>{label.header}</div>
    <div className='description' dangerouslySetInnerHTML={{__html: md.render(label.description)}} />
  </LabelWrapper>
)

const useKeyPress = function (targetKey) {
  const [keyPressed, setKeyPressed] = useState(false);

  function downHandler({ key }) {
    if (key === targetKey) {
      setKeyPressed(true);
    }
  }

  const upHandler = ({ key }) => {
    if (key === targetKey) {
      setKeyPressed(false);
    }
  };

  React.useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  });

  return keyPressed;
};

function useWindowSize() {
  const isClient = typeof window === 'object';

  function getSize() {
    return {
      width: isClient ? window.innerWidth : undefined,
      height: isClient ? window.innerHeight : undefined
    };
  }

  const [windowSize, setWindowSize] = useState(getSize);

  useEffect(() => {
    if (!isClient) {
      return false;
    }

    function handleResize() {
      setWindowSize(getSize());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return windowSize;
}


const EgressFlowBasic = () => {
  const [selected, setSelected] = useState(undefined)
  const downPress = useKeyPress("ArrowRight")
  const upPress = useKeyPress("ArrowLeft")
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(0)
  const size = useWindowSize();
  useEffect(() => {
    if (egressBasicMeta.length && downPress) {
      setIndex(prevState =>
        prevState < egressBasicMeta.length - 1 ? prevState + 1 : 0
      );
    }
  }, [downPress]);
  useEffect(() => {
    if (egressBasicMeta.length && upPress) {
      setIndex(prevState => (prevState > 0 ? prevState - 1 : egressBasicMeta.length));
    }
  }, [upPress]);
  useEffect(() => {
    if (egressBasicMeta.length && hovered >= 0) {
      setIndex(hovered);
    }
  }, [hovered]);

  return (
    <Wrapper>
      <DiagramWrapper scale={size}>
        <BackgroundImageWrapper
          src={BackgroundImage}
          onMouseOver={() => setHovered(0)}
          selected={index === 0}
        />
        <ServiceEntryOneImageWrapper
          src={ServiceEntryOne}
          onMouseOver={() => setHovered(1)}
          selected={index === 1}
        />
        <DestinationRuleOneImageWrapper
          src={DestinationRuleOneImage}
          onMouseOver={() => setHovered(2)}
          selected={index === 2}
        />
        <ExternalImageWrapper
          src={External}
          onMouseOver={() => setHovered(3)}
          selected={index === 3}
        />
      </DiagramWrapper>
      <DiagramLabel scale={size}>{egressBasicMeta.map(
        (label, i) => (
          <Label key={`arch-label-${i}`} active={ i === index } label={label} />
        ))
      }</DiagramLabel>
    </Wrapper>
  )
}

export default EgressFlowBasic
