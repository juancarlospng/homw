# Legacy JS Integration Notes

The previous tour script in `Public/scripts/222.js` was used as the behavior reference for this React UI.

## Preserved Command Shape
- Mood controls emit `{ time }` with Unreal values from `186` to `362`.
- Top navigation emits tour commands for Unreal with the field `topcall`, for example `{ topcall: "callhome" }`.
- Sofa emits `openfrabricpalette`; Wall and Gabinets emit `openwoodpalette`.
- Material controls emit `{ dbt: "materialpared", material, index, mesh, palette }`; `mesh` is kept only as the backend descriptor key, while the UI language uses furniture/item wording.
- The bridge still supports `window.ArcanePlayer.emitUIEvent(payload)` when available.

## Preserved Response Parsing
The React bridge parses these legacy responses:
- `HitTrue`, `DoorHitTrue`, `EditableHitTrue`
- `MaterialPared`
- `openwoodpalette`
- `openfrabricpalette`
- `openfabricpalette`
- `apartment`
- `gamepause`
- `gameresume`
- `explorerlevel`
- `Unit...`
- unit detail HTML containing `<b>Surface</b><br>`
- availability strings: `Available`, `Reserved`, `Sold`, `Hold`

## React Bridge Entry Points
- `window.homwEmitUIInteraction(payload)` can be assigned by the streaming layer.
- `window.homwHandleUnrealResponse(response)` can be called by Unreal/Arcware response handlers.
- If `window.ArcanePlayer.emitUIEvent` exists, the bridge uses it automatically.
- `window.homwSetUnrealDebug(true | false)` enables or disables outgoing Unreal payload logs.
- `window.homwGetUnrealDebug()` returns the current debug state.

## Debug Console
- Outgoing Unreal payloads are printed in the browser inspector only when Unreal debug is enabled.
- Debug is enabled by default in Vite dev mode and disabled by default in production builds.
- Enable from URL: `?homwDebugUnreal=1`.
- Disable from URL: `?homwDebugUnreal=0`.
- Enable persistently from the inspector console: `window.homwSetUnrealDebug(true)`.
- Disable persistently from the inspector console: `window.homwSetUnrealDebug(false)`.
- For environment control, use `VITE_HOMW_DEBUG_UNREAL=true` or `VITE_HOMW_DEBUG_UNREAL=false`.

## Pixel Streaming
- The React app now mounts the Arcware WebRTC client in `src/components/streaming/ArcwarePixelStream.tsx`.
- Pixel Streaming is enabled by default.
- Force-enable it from the URL with `?homwStream=1`.
- Disable it from the URL with `?homwStream=0`.
- Control it from environment config with `VITE_HOMW_PIXEL_STREAMING=true` or `VITE_HOMW_PIXEL_STREAMING=false`.
- Current Arcware defaults:
  - `address`: `wss://signalling-client.ragnarok.arcware.cloud/`
  - `shareId`: `share-cd5f65c6-ecab-4925-9cc1-54c2e6b48edd`
  - `projectId`: `0432103a-2246-4448-86c5-413f4ce947af`
- These can be overridden with `VITE_ARCWARE_ADDRESS`, `VITE_ARCWARE_SHARE_ID`, and `VITE_ARCWARE_PROJECT_ID`.
- They can also be overridden from the URL with `arcwareAddress`, `arcwareShareId`, and `arcwareProjectId`.

## Unit Search
- Clicking Units hides the Explorer intro panel and Live Snapshot panel.
- The filter panel emits the legacy Unreal descriptor shape:
  - `Surface`
  - `Budget`
  - `Bedroomcount`
  - `Bathroomcount`
  - `Availability`
- Unit data is requested from `https://oabwxenpougurdzngyuy.supabase.co/rest/v1/`.
- Default table is `unidades`.
- Override the table with `VITE_SUPABASE_UNITS_TABLE` or `?supabaseUnitsTable=...`.
- Supabase auth uses `VITE_SUPABASE_ANON_KEY`, `?supabaseToken=...`, or the legacy `?token=...` URL param.
- Selecting a unit from the Supabase list hides filters and shows the selected unit detail panel.
- The unit number/title shown in the detail panel uses Supabase `Row Name`.
- If Unreal sends legacy unit details, the filter panel also hides and the detail panel renders that response.
- In explorer, `Go to Live It` sends `tour` to Unreal.
- In tour mode, `Back to Explorer` sends `explorer` to Unreal.

## Files
- `src/integrations/unrealBridge.ts`
- `src/integrations/supabaseUnits.ts`
- `src/hooks/useUnrealBridge.ts`
- `src/components/streaming/ArcwarePixelStream.tsx`
- `src/components/pages/InteriorEditorPage.tsx`
