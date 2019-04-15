import styled from 'styled-components';

const NutryAnimationOneWrapper = styled.div`
  position: absolute;
  z-index: 1;
  width: 400px;

  .cogs-wrapper {
    position: absolute;
    bottom: 200px;
    width: 400px;
  }

  .center-cog-large-logo {
    position: absolute;
    z-index: 2;
  }

  .center-cog-medium-logo {
    position: absolute;
    z-index: 2;
    bottom: -50px;
    left: 100px;
  }

  .spray-images {
    position: absolute;
    z-index: 1;
    bottom: 50px;
    left: 20px;
  }
`;

export default NutryAnimationOneWrapper;
