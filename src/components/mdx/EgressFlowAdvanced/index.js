import React, { useState, useEffect } from 'react'
import { Remarkable } from 'remarkable';

import {
  Wrapper,
  LabelWrapper,
  DiagramWrapper,
  DiagramLabel,
  BackgroundImageWrapper,
  DestinationRuleOneImageWrapper,
  VirtualServiceOneImageWrapper,
  ServiceEntryOneImageWrapper,
  DestinationRuleTwoImageWrapper,
  VirtualServiceTwoImageWrapper,
  ServiceEntryTwoImageWrapper,
  GatewayImageWrapper,
} from './style'


import BackgroundImage from '../../../assets/images/istio/egress-advanced/background.svg'
import DestinationRuleOneImage from '../../../assets/images/istio/egress-advanced/destinationrule-one.svg'
import VirtualServiceOneImage from '../../../assets/images/istio/egress-advanced/virtualservice-one.svg'
import ServiceEntryOneImage from '../../../assets/images/istio/egress-advanced/serviceentry-one.svg'
import ServiceEntryTwoImage from '../../../assets/images/istio/egress-advanced/serviceentry-two.svg'
import DestinationRuleTwoImage from '../../../assets/images/istio/egress-advanced/destinationrule-two.svg'
import VirtualServiceTwoImage from '../../../assets/images/istio/egress-advanced/virtualservice-two.svg'
import GatewayImage from '../../../assets/images/istio/egress-advanced/gateway.svg'

import {
  egressAdvancedMeta,
} from './messages';


const md = new Remarkable();
const Label = ({ label, active }) => (
  <LabelWrapper key={`label-${label.index}`} active={active}>
    <div className='header'>{label.header}</div>
    <div className='description' dangerouslySetInnerHTML={{ __html: md.render(label.description) }} />
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


const EgressFlowAdvanced = () => {
  const [selected, setSelected] = useState(undefined)
  const downPress = useKeyPress("ArrowRight")
  const upPress = useKeyPress("ArrowLeft")
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(0)
  const size = useWindowSize();
  useEffect(() => {
    if (egressAdvancedMeta.length && downPress) {
      setIndex(prevState =>
        prevState < egressAdvancedMeta.length - 1 ? prevState + 1 : 0
      );
    }
  }, [downPress]);
  useEffect(() => {
    if (egressAdvancedMeta.length && upPress) {
      setIndex(prevState => (prevState > 0 ? prevState - 1 : egressAdvancedMeta.length));
    }
  }, [upPress]);
  useEffect(() => {
    if (egressAdvancedMeta.length && hovered >= 0) {
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
          src={ServiceEntryOneImage}
          onMouseOver={() => setHovered(1)}
          selected={index === 1}
        />
        <VirtualServiceOneImageWrapper
          src={VirtualServiceOneImage}
          onMouseOver={() => setHovered(2)}
          selected={index === 2}
        />
        <DestinationRuleOneImageWrapper
          src={DestinationRuleOneImage}
          onMouseOver={() => setHovered(3)}
          selected={index === 3}
        />
        <GatewayImageWrapper
          src={GatewayImage}
          onMouseOver={() => setHovered(4)}
          selected={index === 4}
        />
        <VirtualServiceTwoImageWrapper
          src={VirtualServiceTwoImage}
          onMouseOver={() => setHovered(5)}
          selected={index === 5}
        />
        <ServiceEntryTwoImageWrapper
          src={ServiceEntryTwoImage}
          onMouseOver={() => setHovered(6)}
          selected={index === 6}
        />
         <DestinationRuleTwoImageWrapper
          src={DestinationRuleTwoImage}
          onMouseOver={() => setHovered(7)}
          selected={index === 7}
        />
      </DiagramWrapper>
      <DiagramLabel scale={size}>{egressAdvancedMeta.map(
        (label, i) => (
          <Label key={`arch-label-${i}`} active={ i === index } label={label} />
        ))
      }</DiagramLabel>
    </Wrapper>
  )
}

export default EgressFlowAdvanced