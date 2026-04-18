# M5 — Digital Herbarium

**App:** FacadeLens
**Milestone:** M5 (Herbarium)
**Goal:** Users can save scans to their personal Herbarium. The Herbarium tab displays a grid/list of saved scans as specimen cards with filter and search.

**Depends on:** M4 complete (scan record exists with all fields populated)

---

## Deliverables

1. "Save to Herbarium" action on the scan result screen (auth-gated)
2. Specimen card grid/list view in Herbarium tab
3. Filter sheet: by date captured, element type, architectural style, neighborhood
4. Search by address or tag
5. Tap a card to open the full scan (overlay + critique)
6. Signed URL generation for stored images (private bucket)

---

## New Files

```
app/(tabs)/herbarium.tsx      # REPLACE placeholder with full Herbarium screen
components/
├── SpecimenCard.tsx           # Individual scan card (grid or list)
├── HerbariumGrid.tsx          # FlatList with grid/list toggle
├── FilterSheet.tsx            # Animated bottom sheet with filter controls
└── SaveButton.tsx             # "Save to Herbarium" button on scan result screen
stores/
└── herbariumStore.ts          # Zustand: filter state + view mode
lib/
└── herbarium.ts               # Supabase fetch helpers
```

---

## Save to Herbarium

Saving is implicit — a scan record is created in M2 at the moment of analysis. "Save to Herbarium" simply marks the scan as explicitly saved (the user confirms they want it in their collection).

**Approach:** Add a `saved` boolean column to the `scans` table.

```sql
alter table public.scans add column saved boolean default false;
```

### components/SaveButton.tsx

```tsx
import { useState } from 'react'
import { Button, Text } from 'tamagui'
import { BookBookmark } from 'phosphor-react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'expo-router'

interface Props {
  scanId: string
}

export function SaveButton({ scanId }: Props) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const router = useRouter()

  const handleSave = async () => {
    if (!isAuthenticated) {
      // Gate: prompt sign up before saving
      router.push('/(auth)/sign-up')
      return
    }
    setLoading(true)
    await supabase.from('scans').update({ saved: true }).eq('id', scanId)
    setSaved(true)
    setLoading(false)
  }

  return (
    <Button
      onPress={handleSave}
      disabled={saved || loading}
      icon={<BookBookmark size={18} color={saved ? '#c8a96e' : '#888880'} weight={saved ? 'fill' : 'regular'} />}
      bg={saved ? 'transparent' : '$backgroundStrong'}
      borderWidth={1}
      borderColor={saved ? '#c8a96e' : '$borderColor'}
    >
      <Text color={saved ? '#c8a96e' : '$colorMuted'} fos={14}>
        {saved ? 'Saved' : 'Save to Herbarium'}
      </Text>
    </Button>
  )
}
```

---

## lib/herbarium.ts

```ts
import { supabase } from './supabase'
import { ScanRecord } from '../types/scan'

export interface HerbariumFilters {
  style?: string
  dateFrom?: string
  dateTo?: string
  tag?: string
  searchQuery?: string
}

export async function fetchHerbariumScans(
  userId: string,
  filters: HerbariumFilters = {}
): Promise<ScanRecord[]> {
  let query = supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .eq('saved', true)
    .order('captured_at', { ascending: false })

  if (filters.dateFrom) query = query.gte('captured_at', filters.dateFrom)
  if (filters.dateTo)   query = query.lte('captured_at', filters.dateTo)
  if (filters.tag)      query = query.contains('tags', [filters.tag])
  if (filters.searchQuery) {
    query = query.ilike('building_address', `%${filters.searchQuery}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Get a signed URL for a private Storage image.
 * Cache these per-session — don't request a new signed URL on every render.
 */
export async function getSignedUrl(imagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('facade-photos')
    .createSignedUrl(imagePath, 3600) // 1 hour
  if (error) throw error
  return data.signedUrl
}
```

---

## stores/herbariumStore.ts

```ts
import { create } from 'zustand'
import { HerbariumFilters } from '../lib/herbarium'

type ViewMode = 'grid' | 'list'

interface HerbariumState {
  viewMode: ViewMode
  filters: HerbariumFilters
  setViewMode: (mode: ViewMode) => void
  setFilters: (filters: HerbariumFilters) => void
  clearFilters: () => void
}

export const useHerbariumStore = create<HerbariumState>((set) => ({
  viewMode: 'grid',
  filters: {},
  setViewMode: (viewMode) => set({ viewMode }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}))
```

---

## components/SpecimenCard.tsx

```tsx
import { TouchableOpacity, Image, StyleSheet } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { YStack, Text, XStack } from 'tamagui'
import { MapPin } from 'phosphor-react-native'
import { ScanRecord } from '../types/scan'
import { format } from 'date-fns'

interface Props {
  scan: ScanRecord
  signedUrl: string
  mode: 'grid' | 'list'
  onPress: () => void
  index: number
}

export function SpecimenCard({ scan, signedUrl, mode, onPress, index }: Props) {
  const summary = scan.building_summary
  const date = format(new Date(scan.captured_at), 'MMM d, yyyy')

  if (mode === 'grid') {
    return (
      <Animated.View entering={FadeIn.delay(index * 40).duration(300)} style={styles.gridItem}>
        <TouchableOpacity onPress={onPress} style={styles.gridCard}>
          <Image source={{ uri: signedUrl }} style={styles.gridImage} />
          <YStack p="$2" gap="$1">
            <Text fos={11} color="$color" fw="600" numberOfLines={1}>
              {summary?.probable_style ?? 'Unknown'}
            </Text>
            <Text fos={10} color="$colorMuted">{date}</Text>
          </YStack>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <Animated.View entering={FadeIn.delay(index * 40).duration(300)}>
      <TouchableOpacity onPress={onPress}>
        <XStack bg="$backgroundStrong" br="$4" borderWidth={1} borderColor="$borderColor" overflow="hidden" mb="$3">
          <Image source={{ uri: signedUrl }} style={styles.listImage} />
          <YStack flex={1} p="$3" gap="$1" jc="center">
            <Text fos={14} color="$color" fw="600" numberOfLines={1}>
              {summary?.probable_style ?? 'Unknown'}
            </Text>
            <Text fos={12} color="$colorMuted">{summary?.estimated_period}</Text>
            {scan.building_address && (
              <XStack ai="center" gap="$1" mt="$1">
                <MapPin size={11} color="#888880" weight="regular" />
                <Text fos={11} color="$colorMuted" numberOfLines={1} flex={1}>
                  {scan.building_address}
                </Text>
              </XStack>
            )}
            <Text fos={11} color="$colorMuted">{date}</Text>
          </YStack>
        </XStack>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  gridItem: { width: '50%', padding: 4 },
  gridCard: { backgroundColor: '#111111', borderRadius: 8, overflow: 'hidden' },
  gridImage: { width: '100%', aspectRatio: 4 / 3 },
  listImage: { width: 90, height: 90 },
})
```

---

## components/HerbariumGrid.tsx

```tsx
import { FlatList, Dimensions } from 'react-native'
import { YStack, Text } from 'tamagui'
import { useHerbariumStore } from '../stores/herbariumStore'
import { SpecimenCard } from './SpecimenCard'
import { ScanRecord } from '../types/scan'

interface Props {
  scans: ScanRecord[]
  signedUrls: Record<string, string>
  onCardPress: (scan: ScanRecord) => void
}

export function HerbariumGrid({ scans, signedUrls, onCardPress }: Props) {
  const viewMode = useHerbariumStore((s) => s.viewMode)

  if (scans.length === 0) {
    return (
      <YStack flex={1} ai="center" jc="center" gap="$3">
        <Text color="$colorMuted" fos={15} ta="center">
          No scans saved yet.{'\n'}Scan a building to start your collection.
        </Text>
      </YStack>
    )
  }

  return (
    <FlatList
      // key prop forces remount when viewMode changes — required for numColumns change
      key={viewMode}
      data={scans}
      keyExtractor={(item) => item.id}
      numColumns={viewMode === 'grid' ? 2 : 1}
      renderItem={({ item, index }) => (
        <SpecimenCard
          scan={item}
          signedUrl={signedUrls[item.image_url] ?? ''}
          mode={viewMode}
          onPress={() => onCardPress(item)}
          index={index}
        />
      )}
      contentContainerStyle={{ padding: 8 }}
    />
  )
}
```

> **Gotcha:** `FlatList` does not support changing `numColumns` dynamically after first render. The `key={viewMode}` prop forces a full remount when switching between grid and list — this is the correct approach.

---

## Signed URL Strategy

Private Storage images require signed URLs to display. Don't request a signed URL on every render — cache them in component state or a Zustand map per session.

```ts
// In the Herbarium screen, after fetching scans:
const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

useEffect(() => {
  const fetchUrls = async () => {
    const entries = await Promise.all(
      scans.map(async (scan) => {
        const url = await getSignedUrl(scan.image_url)
        return [scan.image_url, url] as const
      })
    )
    setSignedUrls(Object.fromEntries(entries))
  }
  if (scans.length > 0) fetchUrls()
}, [scans])
```

---

## Mapillary / Unsplash Notes (Future)

- **Mapillary:** In a future version, specimen cards could show a Mapillary street-level photo of the scanned building's location (matched by GPS coordinates) alongside the user's own photo. Use the Mapillary API with `closeto={lng},{lat}` to find nearby images. License: CC-BY-SA.
- **Unsplash:** The Herbarium's "empty state" could show beautiful architectural photography from Unsplash (with UTM attribution) to inspire users to go scan. Use the Unsplash API topic endpoint for `architecture`.

---

## Done Criteria

- [ ] "Save to Herbarium" button appears on scan result screen
- [ ] Unauthenticated tap redirects to sign-up screen
- [ ] Saved scans appear in Herbarium tab
- [ ] Grid view shows 2-column layout with image thumbnails
- [ ] List view shows full-width cards with address and metadata
- [ ] View mode toggle (grid/list) works without crash (`key={viewMode}` pattern)
- [ ] Signed URLs load images correctly (private bucket)
- [ ] Filter sheet opens and filters by date / style / tag
- [ ] Search by address filters results correctly
- [ ] Tapping a card navigates to the full scan view (overlay + critique)
- [ ] Empty state shows when no saved scans
