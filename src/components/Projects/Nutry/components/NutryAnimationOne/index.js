/**
*
* NutryAnimationOne
*
*/

import React from 'react';
import Anime from 'react-anime';
import Transition from 'react-transition-group/Transition';
import { getXPosition, getYPosition } from '../../lib/utils';

// svgs1
import CogLarge from '../../images/cog-large.svg';
import CogMedium from '../../images/cog-medium.svg';
import Carrot from '../../images/carrot.svg';
import Lemon from '../../images/lemon.svg';
import Hotdog from '../../images/hotdog.svg';
import Eggplant from '../../images/eggplant.svg';
import Watermelon from '../../images/watermelon.svg';
import Chicken from '../../images/chicken.svg';
import Avocado from '../../images/avocado.svg';
// svgs2
import Bacon from '../../images/bacon.svg';
import Sushi from '../../images/sushi.svg';
import Egg from '../../images/egg.svg';
import Skewer from '../../images/skewer.svg';
import Pot from '../../images/pot.svg';
import NutryAnimationOneWrapper from './NutryAnimationOneWrapper';
const transitionStyles = {
  entering: {opacity: 0, Ypos: 100},
  entered: {opacity: 1, Ypos: 0},
  exited: {opacity: 0},
};
const data1 = [
  {
    img: Carrot,
    id: 1,
  },
  {
    img: Lemon,
    id: 2,
  },
  {
    img: Hotdog,
    id: 3,
  },
  {
    img: Eggplant,
    id: 4,
  },
  {
    img: Watermelon,
    id: 5,
  },
  {
    img: Chicken,
    id: 6,
  },
  {
    img: Avocado,
    id: 7,
  },
];
const data2 = [
  {
    img: Bacon,
    id: 1,
  },
  {
    img: Sushi,
    id: 2,
  },
  {
    img: Pot,
    id: 3,
  },
  {
    img: Egg,
    id: 4,
  },
  {
    img: Skewer,
    id: 5,
  },
];

function NutryAnimationOne() {
  const radius = 20;
  return (
    <Transition timeout={700} in appear>
      {state => {
        return (
      <NutryAnimationOneWrapper duration={700} {...transitionStyles[state]}>
        <div className="cogs-wrapper" >
          <div className="center-cog-large-logo" >
            {state ===  'entered' && <Anime
              key="cog-large"
              easing="linear"
              duration={15000}
              rotate={360}
              loop
              direction="normal"
            >
              <img alt="" src={CogLarge} />
            </Anime>}
          </div>
          <div className="center-cog-medium-logo" >
          {state ===  'entered' && <Anime
              key="cog-small"
              easing="linear"
              duration={11950}
              rotate={360}
              loop
              direction="reverse"
            >
              <img alt="" src={CogMedium} />
            </Anime>}
          </div>
        </div>
        {state === 'entered' && <Anime
          easing="linear"
          key="spray-images-1"
          duration={4000}
          direction="normal"
          loop
          delay={(el, index) => index * 240}
          opacity={[0.9, 0]}
          translateX={(el, index) => `${getXPosition(radius, index)}rem`}
          translateY={(el, index) => `${getYPosition(radius, index)}rem`}
          rotate={360}
          scale={[0.6, 0.5]}
        >
          {data1.map((item) => <div key={`spray-group-1-${item.id}`} className="spray-images" ><img alt="" src={item.img} /></div>)}
        </Anime>}
        {state === 'entered' && <Anime
          key="spray-images-2"
          easing="linear"
          duration={7000}
          direction="normal"
          loop
          delay={(el, index) => (index * 240) + 200}
          opacity={[0.9, 0]}
          translateX={(el, index) => `${getXPosition(radius, index)}rem`}
          translateY={(el, index) => `${getYPosition(radius, index)}rem`}
          rotate={360}
          scale={[0.6, 0.5]}
        >
          {data2.map((item) => <div key={`spray-group-1-${item.id}`} className="spray-images" ><img alt="" src={item.img} /></div>)}
        </Anime>}
      </NutryAnimationOneWrapper>)}}
      </Transition>
  );
}

export default NutryAnimationOne;
