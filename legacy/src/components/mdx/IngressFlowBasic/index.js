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
  DestinationRuleTwoImageWrapper,
  VirtualServiceTwoImageWrapper,
  GatewayImageWrapper,
} from './style'

import BackgroundImage from '../../../assets/images/istio/ingress/background.svg'
import DestinationRuleOneImage from '../../../assets/images/istio/ingress/destinationrule-one.svg'
import VirtualServiceOneImage from '../../../assets/images/istio/ingress/virtualservice-one.svg'
import DestinationRuleTwoImage from '../../../assets/images/istio/ingress/destinationrule-two.svg'
import VirtualServiceTwoImage from '../../../assets/images/istio/ingress/virtualservice-two.svg'
import GatewayImage from '../../../assets/images/istio/ingress/gateway.svg'

import {
  ingressBasicMeta,
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


const IngressFlowBasic = () => {
  const [selected, setSelected] = useState(undefined)
  const downPress = useKeyPress("ArrowRight")
  const upPress = useKeyPress("ArrowLeft")
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(0)
  const size = useWindowSize();
  useEffect(() => {
    if (ingressBasicMeta.length && downPress) {
      setIndex(prevState =>
        prevState < ingressBasicMeta.length - 1 ? prevState + 1 : 0
      );
    }
  }, [downPress]);
  useEffect(() => {
    if (ingressBasicMeta.length && upPress) {
      setIndex(prevState => (prevState > 0 ? prevState - 1 : ingressBasicMeta.length));
    }
  }, [upPress]);
  useEffect(() => {
    if (ingressBasicMeta.length && hovered >= 0) {
      setIndex(hovered);
    }
  }, [hovered]);

  return (
    <Wrapper>
      <DiagramWrapper scale={size}>
        <BackgroundImageWrapper
          src={BackgroundImage}
          key={0}
          onMouseOver={() => setHovered(0)}
          selected={index === 0}
        />
        <GatewayImageWrapper
          src={GatewayImage}
          key={1}
          onMouseOver={() => setHovered(1)}
          selected={index === 1}
        />
        <VirtualServiceTwoImageWrapper
          src={VirtualServiceTwoImage}
          key={2}
          onMouseOver={() => setHovered(2)}
          selected={index === 2}
        />
        <DestinationRuleTwoImageWrapper
          src={DestinationRuleTwoImage}
          key={3}
          onMouseOver={() => setHovered(3)}
          selected={index === 3}
        />
        <VirtualServiceOneImageWrapper
          src={VirtualServiceOneImage}
          key={4}
          onMouseOver={() => setHovered(4)}
          selected={index === 4}
        />
        <DestinationRuleOneImageWrapper
          src={DestinationRuleOneImage}
          key={5}
          onMouseOver={() => setHovered(5)}
          selected={index === 5}
        />
      </DiagramWrapper>
      <DiagramLabel scale={size}>{ingressBasicMeta.map(
        (label, i) => (
          <Label key={`arch-label-${i}`} active={ i === index } label={label} />
        ))
      }</DiagramLabel>
    </Wrapper>
  )
}

export default IngressFlowBasic
