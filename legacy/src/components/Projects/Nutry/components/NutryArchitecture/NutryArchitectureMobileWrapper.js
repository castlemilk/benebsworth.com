import styled from 'styled-components'

const NutryArchitectureMobileWrapper = styled.div`
  @media only screen and (min-width: 380px) and (max-width: 576px) {
    margin-right: 0;
  }

  .architecture-box {
    margin: 0 auto;
    position: relative;
    height: 400px;
    width: 359px;
    text-align: center;
    justify-content: center;
  }

  .architectureDataSources {
    position: absolute;
    z-index: 2;
    top: 10px;
    right: 5px;
  }

  .architectureDataSources:hover {
    position: absolute;
    z-index: 2;
    top: 5px;
    right: 0;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }

  .architecturePathOne {
    position: absolute;
    top: 49px;
    right: 60px;
    z-index: 2;
  }

  .architecturePathOne:hover {
    position: absolute;
    top: 45px;
    right: 55px;
    z-index: 2;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }

  .architectureCoreSystem {
    position: absolute;
    top: 76px;
    right: 102px;
    z-index: 2;
  }

  .architectureCoreSystem:hover {
    position: absolute;
    top: 71px;
    right: 97px;
    z-index: 2;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }

  .architecturePathTwo {
    position: absolute;
    top: 71px;
    right: 161px;
    z-index: 1;
  }

  .architecturePathTwo:hover {
    position: absolute;
    top: 68px;
    right: 158px;
    z-index: 1;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }

  .architectureAI {
    position: absolute;
    top: 34px;
    right: 187px;
    z-index: 2;
  }

  .architectureAI:hover {
    position: absolute;
    top: 29px;
    right: 185px;
    z-index: 2;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }

  .architecturePathThree {
    position: absolute;
    top: 94px;
    right: 104px;
    z-index: 1;
  }

  .architecturePathThree:hover {
    position: absolute;
    top: 89px;
    right: 99px;
    z-index: 1;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }

  .architectureEnterprise {
    position: absolute;
    top: 92px;
    right: 255px;
    z-index: 1;
  }

  .architectureEnterprise:hover {
    position: absolute;
    top: 87px;
    right: 250px;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }

  .architectureGUI {
    position: absolute;
    top: 140px;
    right: 177px;
    z-index: 1;
  }

  .architectureGUI:hover {
    position: absolute;
    top: 135px;
    right: 172px;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }

  .architectureAPI {
    position: absolute;
    top: 180px;
    right: 97px;
    z-index: 1;
  }

  .architectureAPI:hover {
    position: absolute;
    top: 175px;
    right: 92px;
    background-position: 0 0;
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`

export default NutryArchitectureMobileWrapper
