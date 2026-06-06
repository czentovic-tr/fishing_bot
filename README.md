# Auto-Fishing (Asura)

Automated fishing mod for **TERA** on the **Asura** private server, running under TERA Toolbox.

- **Developer / Maintainer:** [czentovic-tr](https://github.com/czentovic-tr)
- **Original mod by:** SoliaRdi

It auto-completes the fishing minigame, uses bait/rods, crafts bait from filets, and dismantles unwanted fish — all with humanized, tier-scaled timing to behave like a real player.

---

## Features
- **Fully automatic** catching on patch ≥88 (auto-calibrates the fishing counter — no manual setup).
- **Humanized, tier-scaled reel timing** — harder fish take longer to land (a perfect-human floor that the bot never beats; capped at 28s, under the game's 30s minigame timer).
- **Table-driven instant dismantle** — pick which fish to dismantle; marked fish are dismantled the moment they're caught (and any already in your bag when you start).
- **Bait self-sufficiency** — dismantled fish become filets, which auto-craft into bait.
- **Anti-detection** — triangular humanized delays + occasional hesitation, break scheduling, randomized GM-detection response, speed presets.
- **Auto-stop** — by time limit, daily clock, or when the bag fills with kept fish.
- **Self-contained** — registers its own packet definitions; just drop the folder in.

---

## Requirements & Install
1. TERA Toolbox (Asura edition), **run as administrator** (required for injection + writing settings).
2. Extract the `auto-fishing` folder into the toolbox `mods` folder, so you have:
   `…\TeraToolbox\mods\auto-fishing\index.js`
3. Restart the toolbox and log in.

A per-character config file (`config.json`) is created automatically on first login.

---

## Quick start
1. In chat: `/8 fish` to enable.
2. Cast your rod once. The bot takes over: bite → minigame → catch → dismantle (if marked) → recast.
3. `/8 fish help` lists everything. `/8 fish about` shows credits.

---

## Commands
| Command | Description |
|---|---|
| `/8 fish` | Enable / disable fishing |
| `/8 fish settings` | Show current configuration |
| `/8 fish speed slow\|normal\|fast` | Timing preset (affects react/recast + reel bias) |
| `/8 fish info` | Show patch version + whether fishing packets are mapped |
| `/8 fish stats` | Session stats (uptime, fish/hour, per-level, filets, etc.) |
| `/8 fish debug` | Toggle packet logging to `auto-fishing-debug.log` |
| `/8 fish humanize` | Toggle humanized delays |
| `/8 fish breaks on\|off` · `breaks set <fishMin> <fishMax> <idleMin>` | Periodic idle breaks |
| `/8 fish autostop <min>` · `autostop daily <HH:MM>` | Auto-stop conditions |
| `/8 fish gmmode exit\|lobby\|stop\|nothing` | What to do if a GM is nearby |
| `/8 fish skipbaf` · `autosalad` · `setrecipe` | Misc toggles / set craft recipe |
| `/8 fish filetmode bank <n>` | Bank filets when they pile up |
| `/8 fish save` · `reloadconf` | Save / reload settings |

### Dismantle table
| Command | Description |
|---|---|
| `/8 fish dismantle on\|off` | Master toggle for instant dismantle |
| `/8 fish dismantle now` | Dismantle all marked fish currently in your bag |
| `/8 fish dismantle status` | How many fish are marked / kept |
| `/8 fish dismantle tier <0-10> on\|off` | Mark/keep a whole tier |
| `/8 fish dismantle baf on\|off` | Mark/keep all Big Ass Fish |
| `/8 fish dismantle allon \| alloff` | Mark/keep everything |
| `/8 fish dismantle` *(ctrl+click a fish)* | Toggle a single fish |

The table lives in `config.json` under `dismantle.list` (each row has `id`, `name`, `tier`, `dismantle` 0/1). **Default: dismantle tiers 0–8, keep tiers 9, 10 & BAF.** Edit it in Notepad then `/8 fish reloadconf`.

---

## How reel timing works (anti-detection)
`reel = base(4.0–5.5s) + tier × (1.0–1.4s)`, humanized, hard-capped at 28s. Tier comes from the minigame-start packet, so a common fish lands in ~4–5s and a BAF in ~15–20s. The bot **never reels faster than a perfect human** for a given tier. `speed` biases where within that range it lands (fast = near the floor, slow = near the ceiling); it never breaks the floor.

---

## Troubleshooting
- **Nothing happens / "not mapped":** run `/8 fish info`. If packets are missing, your patch differs — report the output.
- **Doesn't auto-fish for another user:** make sure they extracted the whole folder (incl. `defs/`) and run the toolbox **as admin**.
- **Debug log:** `/8 fish debug` writes `mods/auto-fishing/auto-fishing-debug.log` — useful for reporting issues.

---

## Disclaimer
For use on private servers where permitted. Use at your own risk; automation may violate server rules.

Maintained by [czentovic-tr](https://github.com/czentovic-tr) · original by SoliaRdi.
