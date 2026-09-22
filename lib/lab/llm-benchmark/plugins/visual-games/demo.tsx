'use client'

// The evaluated artifacts appear in GeneratedDemo immediately below this
// brief. Do not pass off a hand-written reference as either model's output.
export function LighthouseDemo({ className = '' }: { className?: string }) {
  return <div className={`p-6 text-sm text-muted ${className}`}>
    Choose a model below and run its lighthouse. Drag to orbit, scroll to zoom,
    pause to inspect the island, and reset to compare the same view.
  </div>
}

export function CarRacerDemo({ className = '' }: { className?: string }) {
  return <div className={`p-6 text-sm text-muted ${className}`}>
    Choose a model below and run its racer. Click inside the game, use arrow
    keys or WASD to drive, and restart to try again. Touch controls are part of the task.
  </div>
}
