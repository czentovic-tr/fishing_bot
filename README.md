# Auto-Fishing (Asura)

Automated fishing mod for **TERA** on the **Asura** private server, running under TERA Toolbox.

- **Developer / Maintainer:** [czentovic-tr](https://github.com/czentovic-tr) / [Emre-Ged](https://github.com/Emre-Ged)
- **Original mod by:** SoliaRdi

It auto-completes the fishing minigame, uses bait/rods, crafts bait from filets, and dismantles unwanted fish — all with humanized, tier-scaled timing to behave like a real player.

> In-game control is via chat commands: `/8 fish ...`. Type `/8 fish help` for the list, `/8 fish about` for credits.

---

## Features
- **Fully automatic** catching on patch ≥88 (auto-calibrates the fishing counter — no manual setup).
- **Humanized, tier-scaled reel timing** — harder fish take longer to land (a perfect-human floor the bot never beats; capped at 28s, under the game's ~30s minigame timer).
- **Table-driven instant dismantle** — choose which fish to dismantle; marked fish are dismantled the moment they're caught (and any already in your bag when you start).
- **Auto-craft bait** from filets, using a recipe you pick once — fills your bait stack and keeps fishing indefinitely.
- **Anti-detection** — triangular humanized delays + occasional hesitation, break scheduling, randomized GM-detection response, speed presets.
- **Auto-stop** — by time limit, daily clock, or when the bag fills with kept fish.
- **Self-contained & auto-updating** — registers its own packet definitions and updates itself from this repo.

---

## Requirements & Install
1. TERA Toolbox (Asura edition), **run as administrator** (required for injection + writing settings).
2. Put the mod files in a folder under the toolbox `mods` directory, e.g.:
   `…\TeraToolbox\mods\fishing_bot\index.js`
   (Download this repo as ZIP and extract it there, or `git clone`.)
3. Restart the toolbox and log in.

A per-character settings file (`config.json`) is created automatically on first login, and the mod **auto-updates** from this repo on future launches.

---

## Quick start
1. `/8 fish setrecipe bait3` — pick a bait you have **learned** (bait2–bait5). The bot remembers it forever (per character).
2. `/8 fish` — enable.
3. **Cast your rod once.** The bot takes over: bite → reel → catch → dismantle (if marked) → craft bait when low → recast.

Defaults out of the box: dismantle **tiers 0–8**, keep **tiers 9, 10 & BAF**; auto-craft **on** (needs a recipe set in step 1).

---

## Bait crafting
Each craft turns filets into **10 bait**; bait stacks to **60**. Costs on Asura:

| Bait | Set with | Filets / craft |
|---|---|---|
| Bait II | `/8 fish setrecipe bait2` | 15 |
| Bait III | `/8 fish setrecipe bait3` | 20 |
| Bait IV | `/8 fish setrecipe bait4` | 25 |
| Bait V | `/8 fish setrecipe bait5` | 30 |

- **You must have learned the recipe in-game.** If a craft fails, the bot retries; after 3 fails it disables auto-craft and tells you to check the recipe.
- Your choice is **saved instantly** and persists across mod/game/toolbox restarts (per character). Change it any time with `setrecipe`, or `setrecipe clear` to stop crafting.
- Filets come from **dismantling** the fish you've marked, so the loop is self-sustaining.

Tuning:
- `/8 fish autocraft on|off` — master toggle (default on)
- `/8 fish autocraft target <10-60>` — fill bait up to this amount (default 60)
- `/8 fish autocraft threshold <n>` — start crafting when bait drops to ≤ n (default 0 = when empty)
- `/8 fish autocraft` — show status + per-bait costs

---

## Dismantle table
After each catch, fish you've marked `1` are dismantled instantly (into filets); marked `0` are kept. When the bag fills with **kept** fish, the bot stops and notifies you.

| Command | Description |
|---|---|
| `/8 fish dismantle on\|off` | Master toggle |
| `/8 fish dismantle now` | Dismantle all marked fish currently in your bag |
| `/8 fish dismantle status` | How many are marked / kept |
| `/8 fish dismantle tier <0-10> on\|off` | Mark/keep a whole tier |
| `/8 fish dismantle baf on\|off` | Mark/keep all Big Ass Fish |
| `/8 fish dismantle allon \| alloff` | Mark/keep everything |
| `/8 fish dismantle` *(ctrl+click a fish in chat)* | Toggle that single fish |

The table lives in `config.json` under `dismantle.list` (`id`, `name`, `tier`, `dismantle` 0/1). Edit in Notepad then `/8 fish reloadconf`.

---

## Anti-detection & timing
- **Reel time** = `base 4.0–5.5s + tier × 1.0–1.4s`, humanized, capped at 28s. A common fish lands in ~4–5s, a BAF in ~15–20s. The bot **never reels faster than a perfect human** for a tier.
- **Speed preset** `/8 fish speed slow|normal|fast` — biases the reel within its range and tunes the react/recast/decision delays.
- **Breaks** `/8 fish breaks on` · `breaks set <fishMin> <fishMax> <idleMin>` — periodic idle pauses (fish N min → idle M min).
- **Auto-stop** `/8 fish autostop <min>` (time limit) · `/8 fish autostop daily <HH:MM>`.
- **GM nearby** `/8 fish gmmode exit|lobby|stop|nothing` — reaction (with randomized delay) if a GM appears.
- **Humanized delays** `/8 fish humanize` (on by default).

---

## All commands
| Command | Description |
|---|---|
| `/8 fish` | Enable / disable |
| `/8 fish settings` | Show current configuration |
| `/8 fish info` | Patch version + whether fishing packets are mapped |
| `/8 fish stats` | Session stats (uptime, fish/hour, per-tier, filets, etc.) |
| `/8 fish speed slow\|normal\|fast` | Timing preset |
| `/8 fish setrecipe bait2\|bait3\|bait4\|bait5 \| clear` | Choose bait to craft (saved) |
| `/8 fish autocraft on\|off \| target <n> \| threshold <n> \| minfilets <n>` | Bait crafting |
| `/8 fish dismantle ...` | See the dismantle table above |
| `/8 fish filetmode bank <n>` | Bank filets when they pile up (needs a banker scroll) |
| `/8 fish breaks ... \| autostop ... \| gmmode ...` | Anti-detection (above) |
| `/8 fish skipbaf \| autosalad \| humanize \| notify \| logfile` | Misc toggles |
| `/8 fish save \| reloadconf` | Save / reload settings |
| `/8 fish debug` | Toggle packet logging to `auto-fishing-debug.log` |
| `/8 fish about` · `/8 fish help` | Credits · command list |

---

## Troubleshooting
- **Nothing happens / "not mapped":** run `/8 fish info`. If packets are missing, your patch differs — report the output.
- **Doesn't auto-fish for another user:** make sure they extracted the **whole** folder (incl. `defs/`) and run the toolbox **as administrator**.
- **Bait isn't crafting:** set a recipe you've **learned** (`/8 fish setrecipe bait3`); if it keeps failing, you may not know that recipe — pick a lower one.
- **It stopped after a while:** likely the bag filled with kept fish (it notifies), or an auto-stop/break triggered. Check `/8 fish settings`.
- **Debug log:** `/8 fish debug` writes `mods/<folder>/auto-fishing-debug.log` — useful for reporting issues.

---

## Updating
The mod auto-updates from this repo on toolbox launch (hash-checked manifest). No manual steps for users.

---

## Disclaimer
For use on private servers where permitted. Use at your own risk; automation may violate server rules.

Maintained by [czentovic-tr](https://github.com/czentovic-tr) / [Emre-Ged](https://github.com/Emre-Ged) · original by SoliaRdi.
