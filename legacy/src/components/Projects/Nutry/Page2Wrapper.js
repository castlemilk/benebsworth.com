import styled from 'styled-components';

const Page2Wrapper = styled.div`
  overflow: hidden;
  padding: 0;
  width: 100%;
  .page2 {
    background: #eff3f6;
    min-height: 1200px;
    overflow: initial;
    padding-top: 1px;
    display: flex;
    justify-content: center;
  }
  .page2-title {
    color: #7e3fbf;
  }
  
  .home-page-wrapper .page h2 {
    font-size: 60px;
    line-height: 46px;
    color: #7e3fbf;
    text-align: center;
    font-weight: 400;
    margin: 140px auto 100px;
    z-index: 10;
  }  
  .descriptions-box {
    margin: 20px;
  }
  .home-page-wrapper .page {
    max-width: 1600px;
  }

  .page2 .page {
    position: relative;
    z-index: 1;
    padding-left: 20px;
    padding-right: 20px;
    width: 100%;
  }

  .page2-content {
    box-shadow: 0 12px 20px #d8e0e6;
    background: #2f54eb;
    display: flex;
    margin-right: 0;
    margin-left: 0;
  }

  .page2-descriptions,
  .page2-architecture {
    min-height: 554px;
  }

  .page2-descriptions {
    position: relative;
    background: #b88ce4;
    color: #fff;
    line-height: 32px;
    z-index: 10;
  }
  .page2-architecture-view {
    margin-top: 20px;
  }
  .page2-architecture {
    background: white;
  }

  .page2-descriptions h3 {
    margin: 0 auto 32px;
    font-size: 35px;
    text-align: center;
    display: block;
    position: relative;
    color: black;
    margin-top: 20px;
  }

  .page2-descriptions span {
    font-size: 25px;
  }

  .page2-architecture h3 {

    font-size: 28px;
    text-align: center;
    margin: auto;
    display: block;
    position: relative;
    color: black;
    margin-top: 20px;
  }
`;

export default Page2Wrapper;
