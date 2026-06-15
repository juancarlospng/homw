# WBP_TourHUD

## Purpose
Primary HOMW in-apartment virtual tour HUD. It keeps the interior viewport visible while exposing navigation, mesh customization, confidence and preview controls.

## Panel Hierarchy
- Top navigation: HOMW brand, Home, Amenities, Sourrondings, Units.
- Left stack: Interior Customization, Space Mood, Interior Style, Tour Status, Customize Furniture, Material Palette.
- Center marker: active viewpoint label.
- Right stack: Interior Confidence, Material Palette, Real-Time Preview.
- Bottom journey bar: Explore, Customize.

## States
- Active tab: current top navigation item.
- Selected buttons: dark purple fill, white text.
- Inactive buttons: translucent white, soft ink text.
- Material Palette is hidden until the web UI receives `openwoodpalette`, `openfrabricpalette`, or `openfabricpalette`.
- Preview toggles: on/off with purple active track.
- Mobile: collapse panels into bottom-sheet sections.

## Colors
- Background: viewport render.
- Glass: rgba(255,255,255,0.54).
- Text: #111827.
- Muted text: #756D65.
- Primary accent: #240735.
- Border: rgba(17,24,39,0.08).

## Typography
Use Inter or the closest available premium sans-serif. Panel titles are 18 px semibold. Labels are 11 px uppercase without extra letter spacing.

## Interaction Behavior
Buttons lift subtly on hover. Panels fade in gently. Respect reduced motion by disabling animation. The viewport must remain the dominant visual.

## Required Blueprint Events
- OnMoodChanged
- OnInteriorStyleSelected
- OnMaterialSelected
- OnSelectFurnitureItem
- OnOpenWoodPalette
- OnOpenFabricPalette
