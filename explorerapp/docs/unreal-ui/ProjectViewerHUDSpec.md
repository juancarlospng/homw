# WBP_ProjectViewerHUD

## Purpose
Project-level HUD that visually matches the interior tour UI and prepares the user journey before entering a unit.

## Panel Hierarchy
- Top navigation: Home, Amenities, Sourrondings, Units.
- Left overview: Project Visualization, Overview, Towers, Residences, Floors, View Project Details.
- Tower selector: Tower A, Tower B, Floor selector, Available units, View Floor Plan.
- Right snapshot: Available, Reserved, Sold, Explore Units.
- Layer controls: Buildings, Greenspace, Transit, Points of Interest, Demand Heatmap, Reset Layers.
- Bottom journey bar: Explore, Select Tower, Choose Unit, Customize, Analyze, Reserve.

## States
- Active layer: purple selected state.
- Availability: Available, Reserved, Sold, Hold.
- Active tower/floor: purple selected state with subtle glow.

## Colors
Match the HOMW token set: #F7F4EE base, #240735 accent, translucent glass panels, soft borders and restrained shadows.

## Typography
Same hierarchy as WBP_TourHUD for platform continuity.

## Interaction Behavior
Selecting tower/floor updates highlighted project geometry and unit list. Layer toggles update visibility in the viewport. Reserve remains the primary CTA.

## Required Blueprint Events
- OnSelectTower
- OnSelectFloor
- OnSelectUnit
- OnRequestUnit
- OnReserveUnit
- OnViewUnitIn3D
