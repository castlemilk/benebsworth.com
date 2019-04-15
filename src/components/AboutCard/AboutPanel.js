import React from 'react'
import MeasureAndRender from './MeasureAndRender'
import Panel from './Panel'

export default props => {
  const dimenions = {
    width: 309,
    height: 274
  }
  const gridStyles = {
    position: 'absolute',
    display: 'grid',
    gridTemplateColumns: dimenions.width,
    gridTemplateRows: dimenions.height,
    zIndex: 15
  }
  const stroke = -3
  const offset = 0
  const { titleBackgroundWidth, titleBackgroundHeight } = props
  // console.log(props)
  // const titleBackgroundWidth = 70
  const titleBackgroundDifference = 30
  return (
    <div className='about-container' style={{ display: 'block-inline' }}>
      <div style={gridStyles}>
        <div style={{ position: 'relative' }}>
          <MeasureAndRender stretch debounce={1}>
            {bounds => {
              const path = `
                    M${bounds.width / 2 +
                      titleBackgroundWidth -
                      stroke},${stroke}
                    L${bounds.width / 2 -
                      titleBackgroundWidth +
                      stroke},${stroke}
                    L${bounds.width / 2 -
                      (titleBackgroundWidth - titleBackgroundDifference) +
                      stroke},${titleBackgroundHeight - stroke}
                    L${bounds.width / 2 +
                      (titleBackgroundWidth - titleBackgroundDifference) -
                      offset},${titleBackgroundHeight - stroke}
                    Z`

              return <Panel bounds={bounds} path={path} />
            }}
          </MeasureAndRender>
          <div
            style={{
              position: 'absolute',
              textAlign: 'center',
              width: dimenions.width,
              height: dimenions.height,
              fontFamily: 'Prompt',
              fontWeight: `bold`,
              zIndex: 20
            }}
          >
            About
          </div>
        </div>
      </div>
    </div>
  )
}
