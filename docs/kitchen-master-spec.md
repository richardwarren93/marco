# Kitchen master image — generation spec

The Home kitchen is one **wide master image** the app pans across and frames. Every
kitchen (current + future "library" options) must be generated to the SAME spec so
they drop into the pipeline with no code changes.

## Hard specs (do not vary)

- **Generator:** ChatGPT / `gpt-image-1`.
- **Size:** **1536 × 1024 px** (this exact pixel size).
- **Aspect ratio:** **3:2 landscape.** (Not the ultra-wide ~3:1 panorama — that made
  the crops too short/soft. 1024px tall ≈ parity with dedicated portrait panels.)
- **One continuous, straight-on wide view** of the whole room (single perspective,
  no multi-angle). The pan + crops + My Kitchen hero all derive from this one image,
  so it must be internally consistent.

## Composition conventions

Left → right, so the app's focal snap points line up:
- **Left:** window + sink / prep.
- **Center:** the range + hood (the default Home view).
- **Right:** fridge / tall storage.
- Open shelves run along the wall at consistent heights across the room.

Per-kitchen the exact focal fractions are tuned in `RoomPan` (`focals` prop). Sage
kitchen uses `[0.13, 0.5, 0.82]`; a differently-composed room needs its own values.

## Day-1 (empty) rules

Generate the EMPTY starter state: bare shelves, bare walls (no art/notes), clear
counters (no clutter/plants/jars/bowls/cookbooks), blank fridge. Warm, inviting,
softly lit — never cold or sad. Progression objects get inpainted in later.

## Style

Warm painterly storybook illustration (sophisticated, not childish). Cream walls,
sage cabinetry, warm wood, terracotta accents, golden-hour light from a window on
the **left**. Soft shadows, high detail. No text, no people, no watermark, no UI.

## Prompt template

> A warm, cozy **painterly illustration** of a small apartment kitchen at golden
> hour — **one continuous, straight-on wide view of the whole room**. [style line
> above]. Left→right: window + brass faucet + white farmhouse sink on the **left**;
> the range with its hood in the **center**; the refrigerator + tall cabinet on the
> **right**. Open wood shelves at consistent heights. **Day-one EMPTY kitchen**
> [empty rules above]. Generous ceiling headroom and floor. **3:2 landscape, 1536 ×
> 1024.** No text, no people, no watermark.

## Pipeline

1. Generate → save the winner as `public/kitchen/room-wide.png` (active Home master).
2. Keep alternates in `public/kitchen/library/<name>.png` (revertible options).
3. Focals/aspect set in `src/app/tonight/page.tsx` (RoomPan) + `pan-preview`.
4. Progression unlocks: gpt-image-1 inpaint INTO the master, then re-crop — one
   coordinate space keeps every view aligned.
