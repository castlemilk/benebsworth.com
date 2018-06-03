import styled from 'styled-components';

const HeaderWrapper = styled.div`
  background: white;
  padding-top: 20px;
  text-decoration: none;
  .logo-link {
    overflow: hidden;
    float: left;
    height: 120px;
    line-height: 64px;
    text-decoration: none;
    white-space: nowrap;
  }
  .logo {
    margin-right: 30px;
    margin-left: 30px;
  }
  .github-link {
    float: right;
    margin-right: 20px;
    text-decoration: none;
  }
  .github-link a {
    text-decoration: none;
  }
  .github-link a:hover{
    color: purple;
  }
`;

export default HeaderWrapper;
