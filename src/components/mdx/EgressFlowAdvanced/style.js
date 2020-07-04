import styled, { css } from 'styled-components'

const LABEL_FONT_SIZE = 25
export const Wrapper = styled.div`
  display: grid;
  grid-template-areas: "diagram"
                        "label";
  margin-top: 100px;
  grid-column-gap: 10%;
  height: 100%;
  align-items: center;
`
export const LabelWrapper = styled.div`
  grid-area: label;
  height: 600px;
  font-style: 'Merriweather','Georgia', serif !important;
  .header {
    font-size: 30px;
    font-weight: bold;
  }
  .description p {
    font-size: 16px;
  }
  .description pre {
    font-size: 16px;
    font-style: 'Courier New';
    background-color: gray;
  }
  ${props => props.active || css`
    display: none;
  `}
`
export const DiagramWrapper = styled.div`
  grid-area: diagram;
  width: 100%;
  height: 100%;
  margin-top: 0px;
  transform: scale(${props => (props.scale > 1.5 ? 1.5 : props.scale)});
  align-items: center;
  display: flex;
  justify-content: center;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`
export const DiagramLabel = styled.div`
  display: flex;
  justify-content: flex-start;
  font-size: 0.6rem !important;
`


export const BackgroundImageWrapper = styled.img`
  top: 20%;
  overflow: hidden;
  grid-area: image;
  margin: 0px;
  filter: ${props =>
    props.selected
      ? `drop-shadow(0 3px 2px rgb(85, 72, 132)) drop-shadow(0 2px 2px rgb(85, 72, 132))`
      : `none`};
  &:hover {
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`
export const DestinationRuleTwoImageWrapper = styled.img`
  overflow: hidden;
  transform: translateY(-478px);
  margin: 0px;
  filter: ${props =>
    props.selected
      ? `drop-shadow(0 3px 2px rgb(85, 72, 132)) drop-shadow(0 2px 2px rgb(85, 72, 132))`
      : `none`};
  &:hover {
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`
export const ServiceEntryTwoImageWrapper = styled.img`
  overflow: hidden;
  transform: translateY(-420px);
  margin: 0px;
  filter: ${props =>
    props.selected
      ? `drop-shadow(0 3px 2px rgb(85, 72, 132)) drop-shadow(0 2px 2px rgb(85, 72, 132))`
      : `none`};
  &:hover {
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`
export const VirtualServiceTwoImageWrapper = styled.img`
  overflow: hidden;
  transform: translateY(-363px);
  margin: 0px;
  filter: ${props =>
    props.selected
      ? `drop-shadow(0 3px 2px rgb(85, 72, 132)) drop-shadow(0 2px 2px rgb(85, 72, 132))`
      : `none`};
  &:hover {
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`
export const GatewayImageWrapper = styled.img`
  overflow: hidden;
  transform: translateY(-308px);
  margin: 0px;
  filter: ${props =>
    props.selected
      ? `drop-shadow(0 3px 2px rgb(85, 72, 132)) drop-shadow(0 2px 2px rgb(85, 72, 132))`
      : `none`};
  &:hover {
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`
export const DestinationRuleOneImageWrapper = styled.img`
  overflow: hidden;
  transform: translateY(-200px);
  margin: 0px;
  filter: ${props =>
    props.selected
      ? `drop-shadow(0 3px 2px rgb(85, 72, 132)) drop-shadow(0 2px 2px rgb(85, 72, 132))`
      : `none`};
  &:hover {
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`
export const VirtualServiceOneImageWrapper = styled.img`
  overflow: hidden;
  transform: translateY(-140px);
  margin: 0px;
  filter: ${props =>
    props.selected
      ? `drop-shadow(0 3px 2px rgb(85, 72, 132)) drop-shadow(0 2px 2px rgb(85, 72, 132))`
      : `none`};
  &:hover {
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`
export const ServiceEntryOneImageWrapper = styled.img`
  overflow: hidden;
  transform: translateY(-80px);
  margin: 0px;
  filter: ${props =>
    props.selected
      ? `drop-shadow(0 3px 2px rgb(85, 72, 132)) drop-shadow(0 2px 2px rgb(85, 72, 132))`
      : `none`};
  &:hover {
    filter: drop-shadow(0 3px 2px rgb(85, 72, 132))
      drop-shadow(0 2px 2px rgb(85, 72, 132));
  }
`