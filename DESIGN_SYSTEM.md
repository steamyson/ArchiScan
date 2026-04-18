# FacadeLens — Design System

**Version:** 1.0
**Purpose:** Single source of truth for all visual decisions. Reference this before writing any component. Cursor should read this file when making any styling decision.

---

## Design Philosophy

FacadeLens is a **precision instrument**, not a social app. The visual language should feel like a high-end architectural reference tool — dark, warm, typographically considered, with restraint. Every UI element should feel like it belongs in a printed architectural monograph or a museum catalog.

Key principles:
- **Restraint over decoration.** No gradients, no shadows on text, no rounded corners on overlay elements.
- **Typography carries weight.** The critique text IS the product. It must be supremely readable.
- **Dark by default.** The app is used outdoors in sunlight and indoors for studying. Dark mode reduces glare and looks premium.
- **Warmth over cool.** The accent is warm gold, not electric blue. Architecture is materiality and craft.
- **Architectural drawing conventions.** The overlay style borrows from technical drawing: hairline leaders, clean labels, hierarchy by line weight.

---

## Color Palette

### Core Tokens (set in `tamagui.config.ts`)

| Token | Value | Use |
|---|---|---|
| `$background` | `#0a0a0a` | Screen backgrounds |
| `$backgroundStrong` | `#111111` | Cards, sheets, surfaces |
| `$backgroundFocus` | `#1a1a1a` | Hover, subtle highlight, skeleton |
| `$color` | `#f0ede8` | Primary text (warm white, not pure white) |
| `$colorMuted` | `#888880` | Secondary text, labels, metadata |
| `$borderColor` | `#2a2a2a` | All borders and dividers |

### Semantic Colors (use as literals — not tokens)

| Name | Value | Use |
|---|---|---|
| Accent Gold | `#c8a96e` | Primary accent: active icons, section headers, focus rings, leader line highlights |
| Success | `#6bc96e` | High confidence, saved state, success feedback |
| Warning | `#c8a96e` | Medium confidence (reuses accent gold — intentional) |
| Error | `#c96e6e` | Low confidence, error states, destructive actions |
| Primary Structure | `#c8a96e` | Hierarchy color: structural elements |
| Secondary Cladding | `#7eb8c4` | Hierarchy color: cladding elements |
| Ornamental Detail | `#b87db8` | Hierarchy color: ornamental elements |

### Grays (for intermediate states)

```
#f0ede8  — text primary (warm white)
#c8c4be  — text secondary
#888880  — text muted / icons default
#555550  — disabled text
#2a2a2a  — borders / dividers
#1a1a1a  — subtle surface / skeleton
#111111  — card background
#0a0a0a  — screen background
#000000  — overlays (with opacity)
```

---

## Typography

### Typeface
**System font stack** — do not import custom fonts for V1. San Francisco on iOS, Roboto on Android. Both are clean and highly legible.

V2+ consideration: A geometric serif (like Canela or similar) for critique body text would reinforce the "architectural publication" feel.

### Scale

| Name | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `display` | 28 | 700 | 34 | Scan result style name, large headers |
| `title` | 22 | 700 | 28 | Screen titles, BuildingSummaryHeader |
| `heading` | 17 | 600 | 24 | Section headers, card titles |
| `body` | 15 | 400 | 24 | Critique body text — most important |
| `label` | 13 | 600 | 18 | UI labels, section titles (ALL CAPS + letter-spacing) |
| `caption` | 12 | 400 | 18 | Metadata, timestamps, addresses |
| `micro` | 11 | 500 | 16 | Leader line labels, confidence badges, fine print |
| `nano` | 10 | 600 | 14 | Overlay element name tags (space is very constrained) |

### Typography Rules

- Critique body (`body` size, 400 weight, 24px line height) is the most important text in the app. Never compromise its legibility.
- Section headers: `label` size, 700 weight, ALL CAPS, letter-spacing 1.2px, accent gold color
- Never use pure white (`#ffffff`) for text — always use `#f0ede8` (warm white)
- Address and metadata: `caption` size, `$colorMuted` color, single line with `numberOfLines={1}`

```tsx
// Critique body — always use these exact values
<Text fos={15} fw="400" lh={24} color="$color">{critiqueText}</Text>

// Section header label
<Text fos={13} fw="700" color="#c8a96e" tt="uppercase" ls={1.2}>{title}</Text>

// Metadata / caption
<Text fos={12} color="$colorMuted" numberOfLines={1}>{address}</Text>
```

---

## Spacing System

FacadeLens uses Tamagui's default 4px base grid. All spacing values are multiples of 4.

| Token | Value | Common use |
|---|---|---|
| `$1` | 4px | Tight gaps between related elements |
| `$2` | 8px | Icon-to-text gaps, inline spacing |
| `$3` | 12px | Component internal padding (compact) |
| `$4` | 16px | Standard padding, card internal |
| `$5` | 20px | Screen horizontal padding |
| `$6` | 24px | Section gaps |
| `$8` | 32px | Large section breaks |
| `$10` | 40px | Bottom safe area padding |

**Screen horizontal padding:** Always `px="$5"` (20px). Never less.

---

## Border Radius

| Use | Value |
|---|---|
| Cards, sheets | `$4` (16px) — Tamagui token |
| Small chips, labels | `$2` (8px) |
| Buttons | `$3` (12px) |
| Overlay element labels | 3px (literal — small intentional) |
| Focus rings | `$round` (50% — circular) |
| Tab bar | 0 (no radius on tab bar) |

---

## Iconography

### Library
- **Primary:** `phosphor-react-native` — duotone weight for accent icons
- **Secondary:** `@tabler/icons-react-native` — for technical/measurement icons

### Size Standards

| Context | Size |
|---|---|
| Inline with text | 12–14px |
| UI labels / section headers | 16px |
| Buttons | 18–20px |
| Tab bar | 24px |
| Empty state illustrations | 48–64px |

### Weight Standards

| Context | Weight |
|---|---|
| Active / selected | `fill` |
| Accent / highlighted | `duotone` |
| Default UI | `regular` |
| Subtle / secondary | `light` |
| Decorative / large | `thin` |

### Icon Mapping (use these consistently)

| Action / concept | Icon | Library |
|---|---|---|
| Camera / scan | `Camera` | Phosphor |
| Herbarium / collection | `BookBookmark` | Phosphor |
| User / profile | `User` | Phosphor |
| Save | `BookBookmark` | Phosphor (fill when saved) |
| Location / address | `MapPin` | Phosphor |
| Date / time | `Clock` | Phosphor |
| Structural system | `Columns` | Phosphor |
| Warning / low confidence | `Warning` | Phosphor |
| Info / disclosure | `Info` | Phosphor |
| Filter | `Funnel` | Phosphor |
| Search | `MagnifyingGlass` | Phosphor |
| Grid view | `GridFour` | Phosphor |
| List view | `List` | Phosphor |
| Close / dismiss | `X` | Phosphor |
| Rhythm & Repetition | `Metronome` | Phosphor |
| Proportion & Scale | `Ruler` | Phosphor |
| Materiality & Tectonics | `Cube` | Phosphor |
| Contextual Dialogue | `Buildings` | Phosphor |
| Light & Shadow | `Sun` | Phosphor |
| Apple sign-in | `AppleLogo` | Phosphor |
| Error / not a facade | `Camera` (thin) | Phosphor |

---

## Component Patterns

### Cards

All cards share this pattern:
```tsx
<YStack
  bg="$backgroundStrong"
  br="$4"
  borderWidth={1}
  borderColor="$borderColor"
  overflow="hidden"
>
  {/* content */}
</YStack>
```

Never add box shadows to cards — the border is the only depth cue. Shadows look wrong on dark backgrounds.

### Buttons

Primary action button:
```tsx
<Button
  bg="#c8a96e"
  pressStyle={{ opacity: 0.8 }}
  br="$3"
  h={48}
>
  <Text color="#0a0a0a" fw="600" fos={15}>{label}</Text>
</Button>
```

Secondary / ghost button:
```tsx
<Button
  bg="transparent"
  borderWidth={1}
  borderColor="$borderColor"
  pressStyle={{ bg: '$backgroundFocus' }}
  br="$3"
  h={48}
>
  <Text color="$color" fw="500" fos={15}>{label}</Text>
</Button>
```

Destructive button: same as secondary but `borderColor="#c96e6e"` and `color="#c96e6e"`.

**Button height:** Always 48px for primary actions. 40px for secondary/compact.

### Bottom Sheets

All bottom sheets use the same pattern:
- Background: `#111111`
- Top border radius: 20px
- Top border: 1px `#2a2a2a`
- Drag handle: 36px wide, 4px tall, `#2a2a2a` color, centered at top
- Backdrop: black at 50% opacity
- Dismiss: tap backdrop OR drag down > 80px

### Skeleton Loaders

Use `$backgroundFocus` (#1a1a1a) for skeleton placeholder blocks. No shimmer animation in V1 — static blocks are sufficient and simpler.

```tsx
<YStack w="100%" h={60} br="$2" bg="$backgroundFocus" />
```

---

## Animation Timing

| Animation | Duration | Easing | Delay |
|---|---|---|---|
| Screen transition | 300ms | spring (damping 20, stiffness 200) | 0 |
| Overlay label entrance | 300ms | FadeIn | 80ms × index |
| Critique section entrance | 400ms | FadeIn | 100ms × index |
| Bottom sheet open | spring | damping 20, stiffness 200 | 0 |
| Bottom sheet close | 250ms | timing | 0 |
| Focus ring | 150ms in, 800ms out | timing | 0 |
| Backdrop fade | 250ms | timing | 0 |
| Button press | 100ms | timing (opacity 0.8) | 0 |

---

## Overlay Visual Language

The Anatomy Overlay borrows from architectural drawing conventions:

| Element | Style |
|---|---|
| Leader lines | 0.8px stroke, element hierarchy color, 70% opacity |
| Element dot (leader endpoint) | 3px filled circle, hierarchy color, 90% opacity |
| Label border | 1px solid, hierarchy color |
| Label background | `rgba(10, 10, 10, 0.75)` — semi-transparent dark |
| Label text | 10px, 600 weight, hierarchy color |
| Leader line style | Straight lines only — no curved leaders in V1 |

---

## Loading & Empty States

### Loading
- During analysis: Lottie scanner animation + vocabulary fact card (see `AnalyzingOverlay` in M2)
- During data fetch: static skeleton blocks (`$backgroundFocus`)
- Never show a spinner without a label — always pair with context text

### Empty States
- Herbarium empty: Phosphor `BookBookmark` (64px, thin, `$colorMuted`) + 2-line message
- No scans found (search): Phosphor `MagnifyingGlass` (48px, thin) + "No results" message
- Camera not available: Phosphor `Camera` (48px, thin) + permission request button

### Error States
- API / network error: Phosphor `Warning` (48px) + message + "Retry" button
- Not a facade: Phosphor `Camera` (48px, thin) + message + "Try Again" button

---

## Dark Mode Only (V1)

V1 ships dark mode only. Do not implement light mode theming — it doubles the QA surface area. The Tamagui config defines a dark theme; ignore the light theme for V1. If the system is in light mode, the app still shows dark.

```ts
// app/_layout.tsx — force dark theme regardless of system
<TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
```
