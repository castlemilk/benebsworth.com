import { ScrollArea as SdkScrollArea, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from "@ui-sdk/react/scroll-area"

function ScrollArea({ label, items }: { label: string; items: string[] }) {
  return (
    <SdkScrollArea data-kit="scroll-area">
      <ScrollAreaViewport data-kit="scroll-area-viewport" role="region" aria-label={label}>
        <ScrollAreaContent data-kit="scroll-area-content">
          {items.map((item) => (
            <div key={item} data-kit="scroll-area-row">
              {item}
            </div>
          ))}
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar data-kit="scroll-area-scrollbar">
        <ScrollAreaThumb data-kit="scroll-area-thumb" />
      </ScrollAreaScrollbar>
    </SdkScrollArea>
  )
}

export { ScrollArea }
