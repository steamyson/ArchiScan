# FacadeLens

Architecture scanning app — iNaturalist for buildings. React Native + Expo bare workflow.

## Before writing any code
Read the relevant milestone brief (e.g. `M0_foundation.md`) in the repo root first.
Read `cursorrules` for all coding conventions.
Read `DESIGN_SYSTEM.md` for all visual decisions.
Read `ERROR_HANDLING.md` for error patterns.
Read `ARCHITECTURE_PATTERNS.md` for structure rules.

## Current milestone
M1 — Capture

## Key rules
- Expo bare workflow (not managed — Vision Camera requires it)
- Tamagui for all UI — never NativeWind or React Native View/Text directly
- react-native-vision-camera v4 — never expo-camera
- Phosphor Icons — never Lucide
- react-native-reanimated v3 — never Animated from React Native core