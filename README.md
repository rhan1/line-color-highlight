# Line Color Highlight

Highlight any line in your editor with bold text and a color from a vibrant, customizable palette.

## Features

- **Right-click any line** and choose "Highlight Line with Color" to paint it
- **16 built-in colors** — from neon pink to electric blue, designed for dark themes
- **Bold highlighted text** for maximum visibility (configurable)
- **Persistent highlights** — survives editor switches and restarts (per workspace)
- **Smart line tracking** — highlights shift when you insert/delete lines above them
- **Multi-line support** — select multiple lines and highlight them all at once
- **No overlap** — re-highlighting a line cleanly replaces the previous color
- **Keyboard shortcuts** — `Cmd+Alt+H` to highlight, `Cmd+Alt+U` to remove

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Highlight Line with Color | `Cmd+Alt+H` | Pick a color and highlight the current line(s) |
| Remove Line Highlight | `Cmd+Alt+U` | Remove highlight from the current line(s) |
| Remove All Line Highlights | — | Clear all highlights in the current file |

## Default Color Palette

| Color | Background | Use Case |
|-------|-----------|----------|
| REVIEW (Red) | `#ff6666` | Code review markers |
| FIXME (Hot Pink) | `#cc0066` | Bugs to fix |
| TODO (White) | `#FFF` | Action items |
| HACK (Orange) | `#cc6600` | Temporary workarounds |
| Console (Yellow) | `#ffff00` | Debug logging |
| Console Commented | `#333300` | Commented-out debug |
| NOTE (Gray) | `#444` | General notes |
| Section (Dark Gray) | `#333` | Section dividers |
| Success (Green) | `#00cc44` | Completed/working |
| Info (Cyan) | `#00bcd4` | Informational |
| Debug (Purple) | `#7b1fa2` | Debug markers |
| Highlight (Neon Pink) | `#ff2d95` | Eye-catching highlight |
| Warning (Amber) | `#ff8f00` | Warnings |
| Subtle (Dark Teal) | `#1a3a3a` | Low-key annotations |
| Electric Blue | `#0055ff` | Standout highlight |
| Coral | `#ff6f61` | Warm accent |

## Configuration

Customize colors in your `settings.json`:

```json
"lineColorHighlight.colors": [
  { "label": "My Custom Color", "backgroundColor": "#ff0000", "color": "#fff" }
]
```

Toggle bold text:

```json
"lineColorHighlight.boldText": false
```
