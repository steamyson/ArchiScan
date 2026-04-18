# M4 — Critique Display

**App:** FacadeLens
**Milestone:** M4 (Critique Display)
**Goal:** Display the AI-generated written critique below the overlay in a designed, readable layout. Five sections organized by architectural principle. Includes building summary header, AI disclosure note, and staggered entrance animation.

**Depends on:** M3 complete (overlay renders, scan record available)

---

## Deliverables

1. `CritiqueScreen` component — scrollable view below the overlay
2. `BuildingSummaryHeader` — style, period, structural system at the top
3. Five `CritiqueSection` components (one per critique dimension)
4. `AIDisclosure` note at the bottom
5. Staggered section entrance animation (Reanimated `FadeIn`)
6. Skeleton loader while critique data is being parsed

---

## New Files

```
components/
├── CritiqueScreen.tsx         # Scrollable critique container
├── BuildingSummaryHeader.tsx  # Style, period, structural system
├── CritiqueSection.tsx        # Reusable section (title + body)
└── AIDisclosure.tsx           # Machine-generated interpretation disclaimer
lib/
└── critiqueUtils.ts           # JSON.parse helper, markdown stripper
```

---

## Data Note

`critique_text` in the scan record is stored as `JSON.stringify(critique)` — a string, not JSONB. Parse it in the component:

```ts
import { Critique } from '../types/scan'

export function parseCritique(critiqueText: string): Critique | null {
  try {
    return JSON.parse(critiqueText) as Critique
  } catch {
    return null
  }
}

/**
 * Strip any residual markdown bold/italic from LLM output.
 * Gemini occasionally wraps key terms in **bold** even with instructions not to.
 */
export function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim()
}
```

---

## Critique Sections

| Section key | Display title | Phosphor icon |
|---|---|---|
| `rhythm_and_repetition` | Rhythm & Repetition | `Metronome` |
| `proportion_and_scale` | Proportion & Scale | `Ruler` |
| `materiality_and_tectonics` | Materiality & Tectonics | `Cube` |
| `contextual_dialogue` | Contextual Dialogue | `Buildings` |
| `light_and_shadow` | Light & Shadow | `Sun` |

---

## components/CritiqueSection.tsx

```tsx
import Animated, { FadeIn } from 'react-native-reanimated'
import { YStack, Text, Separator } from 'tamagui'
import type { Icon } from 'phosphor-react-native'

interface Props {
  title: string
  body: string
  IconComponent: Icon
  delay: number
}

export function CritiqueSection({ title, body, IconComponent, delay }: Props) {
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(400)}>
      <YStack gap="$3" py="$4">
        <XStack ai="center" gap="$2">
          <IconComponent size={16} color="#c8a96e" weight="duotone" />
          <Text fos={13} fw="700" color="#c8a96e" tt="uppercase" ls={1.2}>
            {title}
          </Text>
        </XStack>
        <Text fos={15} color="$color" lh={24}>
          {body}
        </Text>
        <Separator borderColor="$borderColor" />
      </YStack>
    </Animated.View>
  )
}
```

---

## components/BuildingSummaryHeader.tsx

```tsx
import Animated, { FadeIn } from 'react-native-reanimated'
import { YStack, XStack, Text } from 'tamagui'
import { Buildings, Clock, Columns } from 'phosphor-react-native'
import { BuildingSummary } from '../types/scan'

interface Props {
  summary: BuildingSummary
  address?: string
}

export function BuildingSummaryHeader({ summary, address }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <YStack
        bg="$backgroundStrong"
        br="$4"
        p="$4"
        gap="$3"
        borderWidth={1}
        borderColor="$borderColor"
        mb="$4"
      >
        {address && (
          <Text fos={12} color="$colorMuted" numberOfLines={1}>{address}</Text>
        )}
        <Text fos={22} fw="700" color="$color" lh={28}>
          {summary.probable_style}
        </Text>
        <XStack gap="$4" flexWrap="wrap">
          <XStack ai="center" gap="$1">
            <Clock size={13} color="#888880" weight="regular" />
            <Text fos={12} color="$colorMuted">{summary.estimated_period}</Text>
          </XStack>
          <XStack ai="center" gap="$1">
            <Columns size={13} color="#888880" weight="regular" />
            <Text fos={12} color="$colorMuted">{summary.structural_system}</Text>
          </XStack>
        </XStack>
      </YStack>
    </Animated.View>
  )
}
```

---

## components/AIDisclosure.tsx

```tsx
import { YStack, Text } from 'tamagui'
import { Info } from 'phosphor-react-native'

export function AIDisclosure() {
  return (
    <YStack
      flexDirection="row"
      gap="$2"
      p="$3"
      bg="$backgroundFocus"
      br="$3"
      borderWidth={1}
      borderColor="$borderColor"
      mt="$2"
      mb="$6"
      ai="flex-start"
    >
      <Info size={14} color="#888880" weight="regular" style={{ marginTop: 2 }} />
      <Text fos={12} color="$colorMuted" flex={1} lh={18}>
        This is a machine-generated interpretation intended to provoke discussion, not replace informed human judgment.
      </Text>
    </YStack>
  )
}
```

---

## components/CritiqueScreen.tsx

```tsx
import { ScrollView } from 'react-native'
import { YStack } from 'tamagui'
import { Metronome, Ruler, Cube, Buildings, Sun } from 'phosphor-react-native'
import { BuildingSummaryHeader } from './BuildingSummaryHeader'
import { CritiqueSection } from './CritiqueSection'
import { AIDisclosure } from './AIDisclosure'
import { parseCritique, stripMarkdown } from '../lib/critiqueUtils'
import { ScanRecord } from '../types/scan'

interface Props {
  scan: ScanRecord
}

const SECTIONS = [
  { key: 'rhythm_and_repetition',    title: 'Rhythm & Repetition',    Icon: Metronome },
  { key: 'proportion_and_scale',     title: 'Proportion & Scale',     Icon: Ruler },
  { key: 'materiality_and_tectonics',title: 'Materiality & Tectonics',Icon: Cube },
  { key: 'contextual_dialogue',      title: 'Contextual Dialogue',    Icon: Buildings },
  { key: 'light_and_shadow',         title: 'Light & Shadow',         Icon: Sun },
] as const

export function CritiqueScreen({ scan }: Props) {
  const critique = parseCritique(scan.critique_text)

  if (!critique) {
    return (
      <YStack flex={1} ai="center" jc="center" p="$6">
        <Text color="$colorMuted" ta="center">Critique unavailable for this scan.</Text>
      </YStack>
    )
  }

  return (
    <ScrollView>
      <YStack px="$5" pt="$5">
        <BuildingSummaryHeader
          summary={scan.building_summary}
          address={scan.building_address}
        />

        {SECTIONS.map(({ key, title, Icon }, i) => (
          <CritiqueSection
            key={key}
            title={title}
            body={stripMarkdown(critique[key])}
            IconComponent={Icon}
            delay={i * 100}
          />
        ))}

        <AIDisclosure />
      </YStack>
    </ScrollView>
  )
}
```

---

## Skeleton Loader

Show while the critique data is being parsed or the scan record is loading from Supabase:

```tsx
import { YStack } from 'tamagui'

export function CritiqueSkeleton() {
  return (
    <YStack px="$5" pt="$5" gap="$5">
      {[1, 2, 3, 4, 5].map((i) => (
        <YStack key={i} gap="$2">
          <YStack w={120} h={14} br="$2" bg="$backgroundFocus" />
          <YStack w="100%" h={60} br="$2" bg="$backgroundFocus" />
        </YStack>
      ))}
    </YStack>
  )
}
```

---

## Navigation: Overlay → Critique

The scan result screen has two views: the overlay (M3) and the critique (M4). Use a vertical `ScrollView` that shows the overlay first, followed immediately by the critique below — so the user can scroll down from the image into the written analysis. Alternatively, use a `SegmentedControl` to toggle between "Anatomy" and "Critique" tabs.

For V1, the **scroll approach** is simpler and avoids navigation complexity.

---

## Done Criteria

- [ ] `CritiqueScreen` renders without errors for a real scan record
- [ ] `BuildingSummaryHeader` shows style, period, structural system, and address
- [ ] All five critique sections display with correct titles and body text
- [ ] Sections animate in with staggered fade (100ms per section)
- [ ] Phosphor icons render correctly next to each section title
- [ ] `AIDisclosure` note appears below the last section
- [ ] Skeleton loader shows while data is loading
- [ ] `critique_text` parses from JSON string without errors
- [ ] Markdown artifacts stripped from critique body text
