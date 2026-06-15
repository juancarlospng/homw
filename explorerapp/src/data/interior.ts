export const moods = ["Day", "Sunset", "Night"] as const;

export const interiorStyles = ["Minimal", "Warm", "Modern", "Luxury"] as const;

export const materialPalettes = {
  wood: [
    { id: "wood-01", color: "linear-gradient(135deg, #6f4a2f, #c99b67)", unrealMaterial: "f0dfcc" },
    { id: "wood-02", color: "linear-gradient(135deg, #4a2f22, #9d7049)", unrealMaterial: "e3bc8e" },
    { id: "wood-03", color: "linear-gradient(135deg, #8b6b4f, #dfc2a3)", unrealMaterial: "f1e9df" },
    { id: "wood-04", color: "linear-gradient(135deg, #2d211b, #6d5545)", unrealMaterial: "6a282c" },
  ],
  fabric: [
    { id: "fabric-01", color: "linear-gradient(135deg, #f4f1eb, #cfc7bb)", unrealMaterial: "fafafa" },
    { id: "fabric-02", color: "linear-gradient(135deg, #b9afa5, #756d65)", unrealMaterial: "888d82" },
    { id: "fabric-03", color: "linear-gradient(135deg, #d8cabb, #a88d73)", unrealMaterial: "f1f0e2" },
    { id: "fabric-04", color: "linear-gradient(135deg, #858c7b, #c7cebd)", unrealMaterial: "699e6d" },
  ],
} as const;

export const previewToggles = ["Lighting", "Materials", "Furniture", "Textures", "Shadows"] as const;

export const editableMeshes = [
  { label: "Sofa", palette: "fabric" },
  { label: "Wall", palette: "wood" },
  { label: "Gabinets", palette: "wood" },
] as const;

export const journeySteps = ["Explore", "Customize"] as const;
