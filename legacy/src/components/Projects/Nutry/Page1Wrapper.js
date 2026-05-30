import styled from 'styled-components'

const Page1Wrapper = styled.div`
  background: #7f3fbf;
  @media only screen and (max-width: 1300px) {
    .page1-row {
      margin-top: 0;
    }
    .header {
      z-index: 10;
      color: white;
      position: relative;
      margin-bottom: 300px;
    }
  }
  @media only screen and (min-width: 1300px) {
    .page1-row {
      margin-top: 200px;
    }
  }
  min-height: 1020px;
  .home-page-wrapper .page h2 {
    font-size: 60px;
    line-height: 46px;
    color: white;
    text-align: center;
    font-weight: 400;
    margin-top: 30px;
  }
  .home-page-wrapper .page .header {
    z-index: 10;
    color: white;
    position: relative;
  }

  .home-page-wrapper .page {
    width: 100%;
    max-width: 2200px;
    margin: auto;
    position: relative;
    z-index: 10;
  }

  .page1-block {
    max-width: 250px;
    text-align: center;
    margin: auto;
    display: block;
    position: relative;
    z-index: 1;
  }

  .page1-block h3 {
    margin-top: 10px;
    color: white;
    font-size: 40px;
  }

  .page1-point-wrapper {
    background: transparent;
    fill: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    margin: auto;
    overflow: inherit !important;
  }

  .page1-image {
    display: flex;
    width: 120px;
    height: 120px;
    margin: 46px auto 40px;
    align-items: center;
    justify-content: center;
  }

  .page1-image img:hover {
    border-color: rgba(127, 63, 191, 0.7);
    box-shadow: 0 4px 10px 0 rgba(127, 63, 191, 0.7);
    margin-top: -10px;
  }

  .home-page-wrapper {
    width: 100%;
    padding: 0;
    overflow: hidden;
    position: relative;
    color: #314659;
    font-family: 'SF UI Display', 'Helvetica Neue For Number', -apple-system,
      BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB',
      'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .page1 {
    min-height: 784px;
    background: #7f3fbf;
    background: -webkit-gradient(
      linear,
      left top,
      left bottom,
      from(#7f3fbf),
      to(#7f3fbf)
    );
    background: linear-gradient(to bottom, #7f3fbf 0, #7f3fbf 100%);
  }
`

export default Page1Wrapper
