# Brand Identity Guidelines

## Typography
The app uses a carefully selected font pairing to balance elegance and readability:

- **Display Font (`--font-display`)**: Fraunces 
  - *Used for*: Large headings, dish titles, and emphasis. 
  - *Fallback*: Times New Roman, serif

- **Sans-Serif (`--font-sans`)**: Inter
  - *Used for*: Body text, navigation, buttons, and UI details.
  - *Fallback*: -apple-system, BlinkMacSystemFont, sans-serif

## Color Palette
A luxurious dark theme built on deep blacks, rich graphites, and a striking primary accent.

### Surfaces
- **Background (`--background`)**: `#0a0a0b` (Deep, almost pure black)
- **Cards/Popovers (`--card`, `--popover`)**: `#131316` (Slightly elevated dark gray)
- **Secondary Surfaces (`--secondary`, `--muted`)**: `#1b1b1f` (Lighter graphite for contrast)

### Text
- **Primary Text (`--foreground`)**: `#f3f3f1` (Soft off-white for comfortable reading)
- **Muted Text (`--muted-foreground`)**: `#87878d` (Medium gray for secondary info)

### Accents
- **Primary/Accent (`--primary`, `--accent`)**: `#5fd4c3` (A vibrant, soft teal that pops against the dark background)
- **Primary Foreground (`--primary-foreground`)**: `#06201c` (Deep teal/black for text sitting *on* the primary color)

### UI Elements
- **Borders (`--border`)**: `rgba(255, 255, 255, 0.06)` (Very subtle, semi-transparent white)
- **Destructive Actions (`--destructive`)**: `#d4183d` (Rich, elegant red)
- **Success States**: We utilize `emerald-500` (`#10b981`) for positive confirmations.

## Spacing & Geometry
- **Border Radius (`--radius`)**: `1.25rem` (20px) — creating soft, friendly, but premium cards and sheets.
- **Base Font Size (`--font-size`)**: `16px`

## Visual Aesthetics & Interaction
- **Tactile Details**: Interactive elements use scale transitions (e.g., `active:scale-95` on buttons, spring animations on sheets) to feel native and highly responsive.
- **Cinematic Overlays**: Blur filters (`backdrop-blur-md`) combined with semi-transparent backgrounds are used for modals and success states to maintain context while focusing attention.
- **Gradients**: Subtle linear gradients (like bottom-to-top dark fades) are used to ensure text legibility over full-bleed images.
