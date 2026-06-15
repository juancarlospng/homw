# WBP_MaterialEditor

## Purpose
Controls mesh material palettes and real-time preview layers inside the HOMW apartment tour.

## Panel Hierarchy
- WBP_MoodPanel: Day, Sunset, Night.
- WBP_InteriorStylePanel: Minimal, Warm, Modern, Luxury.
- WBP_FurnitureSelector: Sofa, Wall, Gabinets.
- WBP_MaterialPalette: four unnamed swatches for Wood or Fabric.
- WBP_RealTimePreviewPanel: Lighting, Materials, Furniture, Textures, Shadows.

## Button Labels
Day, Sunset, Night, Minimal, Warm, Modern, Luxury, Sofa, Wall, Gabinets.

## States
- Default: glass surface with subtle border.
- Selected: #240735 fill, white text.
- Disabled: 45% opacity, no hover lift.
- Toggle on: purple track.
- Toggle off: soft neutral track.
- Palette hidden: no material panel rendered.

## Colors
Use HOMW tokens from the web UI. Do not introduce green, bright blue, neon or gaming accents.

## Typography
Use a clean sans-serif. Keep labels short and legible over interior renders.

## Interaction Behavior
Sofa opens the fabric palette. Wall and Gabinets open the wood palette. Material selection updates the Unreal material instance in real time and includes the active furniture item in the descriptor.

## Required Blueprint Events
- OnMoodChanged
- OnMaterialSelected
- OnInteriorStyleSelected
- OnSelectFurnitureItem
- OnOpenWoodPalette
- OnOpenFabricPalette
- OnLightingToggle
- OnMaterialsToggle
- OnFurnitureToggle
- OnTexturesToggle
- OnShadowsToggle
