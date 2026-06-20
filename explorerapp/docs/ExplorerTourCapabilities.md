# HOMW Explorer and Tour Capabilities

This document summarizes what the current HOMW web UI can do in the Explorer and Tour experiences, including the main user flows, Unreal/Arcware bridge messages, and Supabase unit data behavior.

## Overview

The project has two main experiences:

- Explorer: the project-level browsing mode where the user reviews home, amenities, surroundings, and unit availability before entering the live apartment tour.
- Tour: the apartment/live-it mode where the user can walk the space, adjust mood/time, customize materials, and apply or reserve a look.

Both experiences run over the Arcware Pixel Streaming client. The web UI sends interaction descriptors to Unreal, and Unreal can send responses back to update the UI.

## Explorer

Explorer is the default mode unless the URL starts with `?view=tour`. It shows the streamed scene behind a HUD and exposes top-level navigation.

### Top Menu

The top menu contains:

- Home
- Amenities
- Surroundings
- Units

When a top menu item is selected, the web UI sends a `topcall` object to Unreal:

```js
{ topcall: "1100" } // Home
{ topcall: "1101" } // Surroundings
{ topcall: "1102" } // Amenities
{ topcall: "1103" } // Units
```

The visible UI also updates the active section. Selecting Units opens the Unit Search panel.

### Unit Search

The Units section lets the user filter available units. The UI supports:

- Minimum surface
- Maximum budget
- Availability: Available, Reserved, Sold
- Bathroom count: 1, 2, 3
- Bedroom count: 1, 2, 3
- Reset filters
- List of matching units

Whenever filters are open or changed, the web UI sends the filter object to Unreal:

```js
{
  Availability: "123",
  Bathroomcount: "123",
  Bedroomcount: "123",
  Budget: 500000,
  Surface: 20
}
```

Availability maps to:

- Available: `1`
- Reserved: `2`
- Sold: `3`

### Supabase Unit Data

The unit list and unit detail panel use Supabase.

Current Supabase base URL:

```txt
https://oabwxenpougurdzngyuy.supabase.co/rest/v1
```

Current default units table:

```txt
unidades
```

The selected unit detail query uses the `Row Name` column. Example:

```txt
/unidades?select=*&Row Name=eq.726
```

When the app receives a unit descriptor from Unreal, such as:

```txt
Unit 726
```

it extracts the unit number and queries Supabase for that unit. The detail panel currently displays the raw Supabase result field by field. This is intentionally broad for debugging and will be cleaned up into a more organized layout later.

### Selecting a Unit From the Menu

When the user selects a unit from the web unit list, the web UI sends:

```js
{ Unittoselect: "726" }
```

The value comes from Supabase `Row Name`, not the internal database `id`.

After selecting a unit, the UI opens the detail panel. The Back to Filters button returns to the filters without immediately reopening the same unit detail, even if Unreal still holds the last selected unit descriptor.

### Unit Responses From Unreal

The web app listens for unit responses from Unreal:

- `Unit 726`, `Unit 101`, etc. are treated as selected units.
- `Unit None`, `Unit Null`, `Unit Undefined`, and empty `Unit` responses are treated as no unit selected.
- Legacy HTML unit details containing `<b>Surface</b><br>` can still render in the panel.

Incoming Unreal responses are printed in the browser console:

```js
[HOMW <- Unreal] Descriptor ...
```

Outgoing web-to-Unreal payloads can also be printed when Unreal debug is enabled.

### Explorer Mood Controls

Explorer includes Space Mood controls:

- Day
- Sunset
- Night

These map to Unreal time values:

```js
{ time: 317 } // Day
{ time: 353 } // Sunset
{ time: 362 } // Night
```

The user can also adjust time using a slider from Unreal value `186` to `362`.

### Explorer Live Snapshot

When the Unit Search panel is not open, Explorer shows a simple availability snapshot:

- Available
- Reserved
- Sold

This is currently a static summary in the UI.

## Tour

Tour is the live apartment experience. It can be entered from Explorer through the Live It action, which sends:

```js
"tour"
```

Tour mode can return to Explorer with:

```js
"explorer"
```

### Tour Modes

Tour has two journey steps:

- Explore
- Customize

Selecting Explore sends:

```js
"gameresume"
```

Selecting Customize sends:

```js
"gamepause"
```

The UI also responds to Unreal messages such as `gameresume`, `gamepause`, `apartment`, and `explorerlevel` to keep the screen state aligned.

### Movement Guide

Tour mode shows a movement guide for:

- WASD walking
- Mouse look

This is visual guidance only. Actual movement is handled by Unreal.

### Space Mood and Time

Tour mode reuses the same Space Mood controls as Explorer:

- Day
- Sunset
- Night
- Time slider

It sends the same `{ time }` descriptors to Unreal.

### Confidence Panel

Tour mode shows an Interior Confidence panel with a score. It is currently a UI display value and not a live calculation.

### Customize Furniture

Customize mode exposes editable scene items:

- Sofa
- Wall
- Gabinets

Selecting an editable item opens the correct material palette:

```js
"openfrabricpalette" // Sofa/fabric palette
"openwoodpalette"   // Wall and Gabinets/wood palette
```

The UI also updates locally when these palette responses come back from Unreal.

### Material Palettes

The current palettes are:

- Fabric
- Wood

Selecting a material sends:

```js
{
  dbt: "materialpared",
  material: "<unrealMaterial>",
  index: <paletteIndex>,
  mesh: "<selectedMesh>",
  palette: "<activePalette>"
}
```

Material values currently come from the legacy Unreal color/material list.

### Preview Layers

The settings panel can toggle preview layers:

- Lighting
- Materials
- Furniture
- Textures
- Shadows

Each toggle sends:

```js
{ LightingToggle: true }
{ MaterialsToggle: false }
```

The exact key depends on the toggle name.

### Save Look

Save Look sends the current mood, style, mesh, selected material, and active palette:

```js
{
  SaveLook: {
    mood,
    style,
    mesh,
    materialId,
    palette
  }
}
```

This is currently a descriptor event; persistence depends on the Unreal/backend implementation.

### Reserve / Apply to Space

The Reserve action first resumes the game and then sends:

```js
{
  ApplyToSpace: {
    mesh,
    materialId,
    palette
  }
}
```

## Arcware / Pixel Streaming

The UI loads the Arcware WebRTC client from:

```txt
https://unpkg.com/@arcware/webrtc-plugin@latest/index_new.umd.js
```

Current defaults:

```txt
address:   wss://signalling-client.ragnarok.arcware.cloud/
projectId: 0432103a-2246-4448-86c5-413f4ce947af
shareId:   share-cd5f65c6-ecab-4925-9cc1-54c2e6b48edd
```

These can be overridden with URL parameters:

```txt
?arcwareAddress=...
?arcwareProjectId=...
?arcwareShareId=...
```

or Vite environment variables:

```txt
VITE_ARCWARE_ADDRESS
VITE_ARCWARE_PROJECT_ID
VITE_ARCWARE_SHARE_ID
```

## Debugging Tools

The app exposes debug helpers on `window`:

```js
window.homwSetUnrealDebug(true)
window.homwGetUnrealDebug()
window.homwHandleUnrealResponse("Unit 726")
```

Debug can also be enabled from the URL:

```txt
?homwDebugUnreal=1
```

The app logs incoming Unreal descriptors with:

```txt
[HOMW <- Unreal] Descriptor
```

Supabase unit detail requests are logged with:

```txt
[HOMW Supabase] Unit detail query
```

## Current Known Gaps

- The unit detail panel currently displays raw Supabase fields. It still needs a final clean layout.
- The availability snapshot is static.
- Interior Confidence is currently static.
- Save Look and Apply to Space are emitted as descriptors, but their final backend/Unreal persistence depends on implementation outside the web UI.
- Some legacy command names are preserved for Unreal compatibility, including `openfrabricpalette`.
