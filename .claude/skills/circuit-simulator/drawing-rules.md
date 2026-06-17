# Circuit Schematic Drawing Rules

## Golden Rules

### 1. Manhattan Routing Only
Wires must be strictly horizontal or vertical. Never diagonal. Every wire segment is axis-aligned.

### 2. Junction Dots
- Solid filled circle (radius 3-4px) at every point where 3+ wire segments meet
- T-junctions (two wires meeting at right angles) ALWAYS have a dot
- 4-way crossings: avoid them. If unavoidable, mark with a dot if connected, NO dot if crossing

### 3. T-Junctions Only
Never draw a 4-way wire junction. Instead, offset to create two T-junctions:
```
BAD:           GOOD:
  |               |
--+--           --+--
  |               |
                  +--
                  |
```

### 4. Terminal Position Rules

Every component has two terminals at fixed positions relative to its center (x, y), determined by type and rotation:

**Rotation 0° (horizontal, left-to-right)**:
```
Terminal A (left/input)  ←  [COMPONENT]  →  Terminal B (right/output)
```

**Rotation 90° (vertical, top-to-bottom)**:
```
                           Terminal A (top/input)
                                 ↓
                            [COMPONENT]
                                 ↓
                           Terminal B (bottom/output)
```

**Rotation 180° (horizontal, right-to-left)**:
```
Terminal B (right/output) ←  [COMPONENT]  →  Terminal A (left/input)
```

**Rotation 270° (vertical, bottom-to-top)**:
```
                           Terminal B (bottom/output)
                                 ↑
                            [COMPONENT]
                                 ↑
                           Terminal A (top/input)
```

### 5. Terminal Offset Distances

Terminals extend beyond the component body by a fixed lead length. For each type:

| Component | Body Half-Size | Lead Extension | Total Terminal Offset |
|-----------|---------------|----------------|----------------------|
| Resistor  | ±22 (44 wide, 16 tall) | +8 | ±30 |
| Capacitor | ±12 (gap=12, plateH=24) | +8 | ±20 |
| Inductor  | ±28 (4 loops × 14r) | +8 | ±36 |
| V Source  | ±16 (circle r=16) | +8 | ±24 |
| Ground    | N/A (single terminal) | +8 | N/A |

At rotation 0°, Terminal A is at (x - offset, y), Terminal B is at (x + offset, y).

When rotated, the offset applies along the rotated axis:
- 0°: (±offset, 0)
- 90°: (0, ±offset)
- 180°: (∓offset, 0) [A and B swap]
- 270°: (0, ∓offset) [A and B swap]

### 6. Wire Routing Algorithm (Manhattan Connector)

Given two terminals at positions (ax, ay) and (bx, by) on the grid:

1. Both terminal positions are grid-snapped
2. Route uses at most 2 corners (3 segments):
   ```
   Path 1 (horizontal-first):  (ax, ay) → (bx, ay) → (bx, by)
   Path 2 (vertical-first):    (ax, ay) → (ax, by) → (bx, by)
   ```
3. Prefer the path with the shortest total length
4. If both paths equal, prefer horizontal-first

For MULTIPLE components sharing a node, use a STAR topology:
- One terminal is the "hub" (usually the one at the extreme position)
- All other terminals connect to the hub via Manhattan paths
- The hub itself is NOT drawn (it's the junction dot)

### 7. Component Drawing Rules

**Resistor (IEC standard — rectangle)**:
- Body: rectangle 44×16px, rounded corners (radius 3px)
- Lead wires extend 8px from each end of body
- Terminals at lead endpoints
- Label (value) centered below the body
- Wire connections snap to terminal positions

**Resistor (ANSI standard — zigzag)**:
- Alternative: zigzag line of 4 peaks, amplitude 8px
- Leads extend from first and last peak
- NOT used in this simulator (use IEC)

**Capacitor (IEC)**:
- Two parallel vertical plates, 24px tall, gap 12px
- Leads extend 8px horizontally from each plate
- Non-polarized: both plates straight
- Polarized: right plate curved (not used in this simulator)

**Inductor (IEC)**:
- 4 half-circle loops, each radius 7px, total width 56px
- Leads extend 8px from each end
- Terminals at lead endpoints

**DC Voltage Source (circle)**:
- Circle radius 14px
- Plus sign (+) inside upper half
- Minus sign (−) inside lower half
- Leads extend 8px from left and right of circle

**Ground**:
- Vertical line down from terminal
- Three decreasing horizontal lines
- No right terminal (single-ended)

### 8. Grid System
- Grid spacing: 20px
- All component terminals snap to grid
- Junction dots placed at grid intersections
- Wire corners align to grid

### 9. Labeling
- Component values shown in formatValue() format (e.g., "1kΩ", "1µF", "10mH")
- Labels positioned below component (if horizontal) or to the right (if vertical)
- No label for ground
- Node numbers shown as small text near probe points only

### 10. Anti-Patterns to Avoid
- Don't draw wires that pass UNDER components (route around)
- Don't overlap wire labels with component symbols
- Don't use diagonal wire segments EVER
- Don't create 4-way junctions
- Don't place terminals off-grid
- Don't draw wires between terminals that share the same component (self-loop)
