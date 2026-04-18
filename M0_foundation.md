# M0 — Foundation

**App:** FacadeLens
**Milestone:** M0 (Foundation)
**Goal:** Bare Expo project scaffolded with Supabase backend, Tamagui UI, working auth, and navigation shell. No camera, no AI, no overlay — just the skeleton with all dependencies installed and configured.

---

## Deliverables

By the end of M0, the app should:

1. Launch on iOS and Android via Expo Dev Client (not Expo Go)
2. Show a tab navigator with three tabs: Scan (placeholder), Herbarium (placeholder), Profile
3. Allow sign up with email/password, log in, and log out
4. Persist auth state across app restarts (SecureStore)
5. Protect Herbarium and Profile tabs behind auth (redirect to sign-in if unauthenticated)
6. Connect to a Supabase project with `profiles` and `scans` tables created
7. Tamagui theme active with dark mode as default
8. All core dependencies installed and confirmed working

---

## Dependencies (locked)

| Layer | Package | Install command |
|---|---|---|
| UI | `@tamagui/core`, `tamagui`, `@tamagui/config` | `npx expo install tamagui @tamagui/core @tamagui/config` |
| Animation | `react-native-reanimated` | `npx expo install react-native-reanimated` |
| Lottie | `lottie-react-native` | `npx expo install lottie-react-native` |
| Icons | `phosphor-react-native` | `npm install phosphor-react-native` |
| Tabler Icons | `@tabler/icons-react-native` | `npm install @tabler/icons-react-native` |
| SVG (icons + overlay) | `react-native-svg` | `npx expo install react-native-svg` |
| Camera (install now, configure in M1) | `react-native-vision-camera` | `npm install react-native-vision-camera` |
| State | `zustand` | `npm install zustand` |
| Supabase | `@supabase/supabase-js` | `npm install @supabase/supabase-js` |
| Secure storage | `expo-secure-store` | `npx expo install expo-secure-store` |
| Gesture handler | `react-native-gesture-handler` | `npx expo install react-native-gesture-handler` |

---

## Project Scaffold

```bash
# Create bare Expo app
npx create-expo-app facadelens --template bare-minimum
cd facadelens

# Install all dependencies above
# Then prebuild to generate native folders
npx expo prebuild

# Run on iOS simulator
npx expo run:ios

# Install Expo Dev Client for on-device testing
npx expo install expo-dev-client
```

> **Why bare workflow?** react-native-vision-camera v4 requires New Architecture (Fabric + JSI), which needs native code access via `prebuild`. You cannot use Expo Go — use Expo Dev Client for all development.

---

## app.json Configuration

```json
{
  "expo": {
    "name": "FacadeLens",
    "slug": "facadelens",
    "newArchEnabled": true,
    "plugins": [
      "react-native-reanimated/plugin",
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "FacadeLens uses your camera to scan building facades."
        }
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.yourname.facadelens",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "FacadeLens uses your location to record where you scanned a building."
      }
    },
    "android": {
      "package": "com.yourname.facadelens",
      "permissions": ["CAMERA", "ACCESS_FINE_LOCATION"]
    }
  }
}
```

---

## Tamagui Setup

### babel.config.js
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
          logTimings: true,
        },
      ],
    ],
  };
};
```

### tamagui.config.ts
```ts
import { config } from '@tamagui/config/v3'
import { createTamagui } from 'tamagui'

export const tamaguiConfig = createTamagui({
  ...config,
  // Override default theme tokens for FacadeLens dark aesthetic
  themes: {
    ...config.themes,
    dark: {
      ...config.themes.dark,
      background: '#0a0a0a',
      backgroundStrong: '#111111',
      backgroundFocus: '#1a1a1a',
      color: '#f0ede8',
      borderColor: '#2a2a2a',
    },
  },
})

export default tamaguiConfig
export type Conf = typeof tamaguiConfig
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
```

### app/_layout.tsx (root layout)
```tsx
import { TamaguiProvider } from 'tamagui'
import tamaguiConfig from '../tamagui.config'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useColorScheme } from 'react-native'
import { Stack } from 'expo-router'
import { useAuthStore } from '../stores/authStore'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}>
        <Stack screenOptions={{ headerShown: false }} />
      </TamaguiProvider>
    </GestureHandlerRootView>
  )
}
```

---

## Project Structure

```
facadelens/
├── app/
│   ├── _layout.tsx              # Root layout — TamaguiProvider + GestureHandler + auth listener
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigator layout
│   │   ├── scan.tsx             # Placeholder — "Scanner coming in M1"
│   │   ├── herbarium.tsx        # Placeholder — auth-gated
│   │   └── profile.tsx          # User profile + log out
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
├── lib/
│   ├── supabase.ts              # Supabase client (SecureStore adapter)
│   └── auth.ts                  # Auth helper functions
├── stores/
│   └── authStore.ts             # Zustand auth state
├── components/
│   └── ProtectedRoute.tsx       # Redirect to sign-in if not authenticated
├── tamagui.config.ts
├── babel.config.js
├── app.json
└── package.json
```

---

## Supabase Setup

### Auth
- Enable email/password provider in Supabase dashboard
- **Disable email confirmation** during development (re-enable before beta)

### lib/supabase.ts
```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### stores/authStore.ts
```ts
import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  setSession: (session: Session | null) => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  setSession: (session) => set({ session }),
  isAuthenticated: () => get().session !== null,
}))
```

### Database Tables (run in Supabase SQL editor)

```sql
-- Enable PostGIS
create extension if not exists postgis;

-- Profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Scans (schema created now, first writes in M2)
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  overlay_data jsonb,
  building_summary jsonb,
  critique_text text,
  building_address text,
  coordinates geography(point, 4326),
  captured_at timestamptz default now(),
  user_notes text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table public.scans enable row level security;

create policy "Users can view own scans"
  on public.scans for select using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert with check (auth.uid() = user_id);

create policy "Users can update own scans"
  on public.scans for update using (auth.uid() = user_id);

create policy "Users can delete own scans"
  on public.scans for delete using (auth.uid() = user_id);
```

> **Gotcha — RLS ordering:** Always enable RLS (`alter table ... enable row level security`) BEFORE creating policies. If you create policies first, they may not apply correctly.

### Storage
- Create a private bucket called `facade-photos`
- RLS: authenticated users can upload/read only files in their own folder (`{user_id}/*`)

---

## Screen Specs

### Sign Up (`(auth)/sign-up.tsx`)
- Fields: display name, email, password
- Tamagui: `YStack`, `Input`, `Button` from tamagui
- On success: navigate to `/(tabs)/scan`, Zustand store updated

### Sign In (`(auth)/sign-in.tsx`)
- Fields: email, password
- Link: "Don't have an account? Sign up"
- On success: navigate to `/(tabs)/scan`

### Scan Tab (`(tabs)/scan.tsx`)
- Centered placeholder using Tamagui `YStack` + `Text`
- Phosphor `Camera` icon (duotone weight, muted color)
- "Scanner coming in M1"

### Herbarium Tab (`(tabs)/herbarium.tsx`)
- Auth-gated via `ProtectedRoute`
- Placeholder: Phosphor `BookBookmark` icon + "Your collection will appear here"

### Profile Tab (`(tabs)/profile.tsx`)
- Display `display_name` and email from Zustand session
- Tamagui `Button` → "Sign Out" → clears store, navigates to sign-in

### Tab Navigator (`(tabs)/_layout.tsx`)
```tsx
// Icons from phosphor-react-native
import { Camera, BookBookmark, User } from 'phosphor-react-native'
// Tab bar style: dark background #0a0a0a, active tint: amber/warm white
```

---

## Design Tokens (Tamagui)

```
Background:      #0a0a0a
Surface:         #111111
Border:          #2a2a2a
Text primary:    #f0ede8  (warm white)
Text muted:      #888880
Accent:          #c8a96e  (warm gold — architectural feel)
```

---

## Done Criteria

- [ ] `npx expo run:ios` launches without errors (Dev Client, not Expo Go)
- [ ] New Architecture confirmed (`newArchEnabled: true`, no bridge warnings)
- [ ] Tamagui dark theme renders correctly on first launch
- [ ] Phosphor icon renders in tab bar
- [ ] Can create a new account and see profile in Supabase dashboard
- [ ] Can log out and log back in
- [ ] Auth persists after closing and reopening the app
- [ ] Herbarium tab redirects to sign-in when unauthenticated
- [ ] `scans` table and `facade-photos` bucket exist in Supabase (empty)
- [ ] All M1 dependencies installed (`react-native-vision-camera`, `react-native-reanimated`, `lottie-react-native`)
