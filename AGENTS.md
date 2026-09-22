# Agent Instructions - Persian Skribbl

## Visual Design Rule: Hand-Drawn "Rough" Aesthetic

The visual identity and aesthetic of this game **MUST ALWAYS be Rough and hand-drawn (sketchy)**.

### Strict Requirements
1. **Never Replace Rough Components**: Under no circumstances should custom Rough components (`Rough*`) or Wired Elements (`wired-*`) be replaced with plain, flat, modern CSS rounded rectangles or generic cards.
2. **Preserve Sketchy UI**: All interactive elements, notifications, message feeds, badges, dividers, and dialogs must maintain a hand-drawn look powered by [`roughjs`](https://roughjs.com/) and [`wired-elements`](https://wiredjs.com/).
3. **Persian / RTL Consistency**: All hand-drawn components must honor RTL layout (e.g. speech bubble tails pointing rightwards for Persian chat, text aligned properly with `Dastnevis` / `Vazirmatn` fonts).

---

## Reusable Rough Components (`client/src/components/rough/`)

When building or updating UI features, always use these components:

| Component | Description | Primary Use Cases |
| :--- | :--- | :--- |
| `RoughSpeechBubble` | Hand-drawn SVG speech bubble with configurable tail (`bottom-right`, `bottom-left`, `none`) | Chat messages, correct guess alerts, close guess hints |
| `RoughBanner` | Sketchy ribbon banner with notched/swallowtail ends | Secret word display in header, system announcements |
| `RoughCircle` | Hand-drawn irregular circle | Player ranking badges, avatar rings, count badges |
| `RoughPill` | Hand-drawn capsule / pill | Player status chips, timer badge, round counter |
| `RoughBox` | Hand-drawn rectangular container | Panels, toolbars, modal containers |
| `RoughDivider` | Hand-drawn sketchy horizontal or vertical line | Section dividers, header separators |
| `RoughTabs` | Hand-drawn navigation tabs | Tabbed menus and settings |

---

## Styling & Theme Notes
- **Background**: Parchment / paper grid (`#f7f5ed` with dot pattern).
- **Ink & Stroke**: Sketchy ink borders (`#2b2b2b`, `#374151`, `#475569`).
- **Accent Tones**: Warm sketch colors (Amber `#d97706`, Orange `#e67e22`, Emerald `#10b981`, Crimson `#dc2626`).
- **Typography**: Hand-drawn Persian font `Dastnevis` falling back to `Vazirmatn`.
