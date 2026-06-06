'use strict';

const path = require('path');
const fs = require('fs');

// =====================================================================================
//  auto-fishing
//  Developer / Maintainer: czentovic-tr   -   https://github.com/czentovic-tr
//  Original mod by SoliaRdi. Ported & extended for the Asura toolbox.
//
//  Improvements layered on top of the original logic:
//    [B] Reliability  - tryHook + '*' fallback, fixed timer/unhook leaks, startup packet
//                       guard, removed the bogus proxyAuthor warning, moved config onto
//                       the toolbox per-mod settings system (per-character profiles).
//    [C] Anti-detect  - humanized (triangular + occasional hesitation) delays, break
//                       scheduling (fish N min -> idle M min), GM reaction jitter.
//    [E] Features     - richer /8 fish stats, auto-stop (time limit / daily clock),
//                       toggleable notifications and optional log file.
// =====================================================================================

module.exports = function autoFishing(mod) {
    // ---------------------------------------------------------------------------------
    //  Item / template tables (unchanged from the original)
    // ---------------------------------------------------------------------------------
    const ITEMS_FISHES = [
        [206400, 206401], // Tier 0
        [206402, 206403, 206436], // Tier 1
        [206404, 206405, 206437, 206438], // Tier 2
        [206406, 206407, 206439, 206440], // Tier 3
        [206408, 206409, 206410, 206441, 206442], // Tier 4
        [206411, 206412, 206413, 206443, 206444], // Tier 5
        [206414, 206415, 206416, 206417, 206445, 206446], // Tier 6
        [206418, 206419, 206420, 206421, 206447, 206448], // Tier 7
        [206422, 206423, 206424, 206425, 206449, 206450], // Tier 8
        [206426, 206427, 206428, 206429, 206430, 206452, 206451, 206453], // Tier 9
        [206431, 206432, 206433, 206434, 206435, 206454, 206455, 206456], // Tier 10
        [206500, 206501, 206502, 206503, 206504, 206505, 206506, 206507, 206508, 206509, 206510, 206511, 206512, 206513, 206514], // BAF
    ];
    const ITEMS_RODS = [
        [...range(206721, 206728)], // Fairywing Rods
        [...range(206701, 206708)], // Xermetal Rods
        [...range(206711, 206718)], // Ash Sapling Rods
        [206700], // Old Rod
    ];
    const PRICES = [2, 4, 6, 8, 10, 12, 14, 16, 19, 22, 25, 50];
    const FILET_ID = 204052;
    const BAITS = {
        70271: 206000, // Bait I 0%
        70272: 206001, // Bait II 20%
        70273: 206002, // Bait III 40%
        70274: 206003, // Bait IV 60%
        70275: 206004, // Bait V 80%
        70365: 206905, // Dappled Bait 80% + 5%
        70364: 206904, // Rainbow Bait 80% + 10%
        70363: 206903, // Mechanical Worm 80% + 15%
        70362: 206902, // Enhanced Mechanical Worm 80% + 20%
        70361: 206901, // Popo Bait 80% + 25%
        70360: 206900, // Popori Bait 80% + 30%
        70281: 206005, // Red Angleworm 0%
        70282: 206006, // Green Angleworm 20%
        70283: 206007, // Blue Angleworm 40%
        70284: 206008, // Purple Angleworm 60%
        70285: 206009, // Golden Angleworm 80%
        70286: 206828, // Celisium Fragment Bait
        70379: 143188, // Event Bait I
        5000012: 143188, // Event Bait II
        5060038: 856470, // ICEFISH BAIT
        70276: 206053, // Pilidium Bait
        70371: 209189, // Event Shark Bait (Murcai Fishery only)
    };
    const ITEMS_BANKER = [60264, 160326, 170003, 210111, 216754];
    const ITEMS_SELLER = [160324, 170004, 210109, 60262, 60263, 160325, 170006, 210110];
    const TEMPLATE_SELLER = [9903, 9906, 1960, 1961];
    const TEMPLATE_BANKER = 1962;
    const ITEMS_SALAD = [206020, 206040];
    const flatSingle = arr => [].concat(...arr);

    // Fish names (for the auto-generated dismantle table). Tier is derived from ITEMS_FISHES.
    const FISH_NAMES = {
        206400: 'Stone Moroko', 206401: 'Azurecheek Carp',
        206402: 'Crayfish', 206403: 'Clownfish', 206436: 'Sea Anemone',
        206404: 'Angelfish', 206405: 'Black-fin Clownfish', 206437: 'Hermit Crab', 206438: 'Ink Squid',
        206406: 'Squid', 206407: 'Crucian Carp', 206439: 'Core Anemone', 206440: 'Jarflower Cnidaria',
        206408: 'Sea Eel', 206409: 'Tang Fish', 206410: 'Freshwater Eel', 206441: 'Veiltail', 206442: 'Piranha',
        206411: 'Octopus', 206412: 'Marlin', 206413: 'Prince Salmon', 206443: 'Cydippida', 206444: 'Nautiloid',
        206414: 'Mottled Ray', 206415: 'Catfish', 206416: 'Channel Catfish', 206417: 'Eldritch Carp', 206445: 'Pompom', 206446: 'Electric Ray',
        206418: 'Gula Shark', 206419: 'Chroma Salmon', 206420: 'Electric Eel', 206421: 'Yellowfin', 206447: 'Rainbow Anemone', 206448: 'Crimson Tuna',
        206422: 'Dipturus', 206423: 'Stone Octopus', 206424: 'Crimson Marlin', 206425: 'Prism Carp', 206449: 'Red-Eyed Piranha', 206450: 'Azart Veiltail',
        206426: 'Bluefin', 206427: 'Golden Crayfish', 206428: 'Crimson Squid', 206429: 'Mossback', 206430: 'Golden Eel', 206452: 'Starsquid', 206451: 'Pink Slender Catfish', 206453: 'Electric Carp',
        206431: 'Crimson Shark', 206432: 'Specklefin', 206433: 'Makaira', 206434: 'Gluda Shark', 206435: 'Shrieking Eel', 206454: 'Golden Cnidaria', 206455: 'Crimson Salmon', 206456: 'Mimic Octopus',
        206500: 'Giant Blue', 206501: 'Golden Shark', 206502: 'Fairy Snakehead', 206503: 'Golden Sailfish', 206504: 'Queen Salmon', 206505: 'Golden Octopus',
        206506: 'Giant Blue (Exodor)', 206507: 'Golden Ray', 206508: 'Darkfin', 206509: 'Golden Carp', 206510: 'Ammonite', 206511: 'Rainbow Cnidaria',
        206512: 'Azart Piranha', 206513: 'Cloud Anemone', 206514: 'Jarflower Veiltail',
    };

    // [B] Packets the core fishing loop cannot run without. Checked on enter_game.
    const REQUIRED_PACKETS = [
        'S_FISHING_BITE', 'S_START_FISHING_MINIGAME', 'S_FISHING_CATCH',
        'C_START_FISHING_MINIGAME', 'C_END_FISHING_MINIGAME',
        'C_USE_ITEM', 'C_PLAYER_LOCATION', 'S_SYSTEM_MESSAGE', 'S_SPAWN_USER',
    ];

    // ===================== GOLDEN REEL TIMES - DO NOT CHANGE =====================
    // These are the FASTEST reel times a perfect human achieves by hand, per fish tier.
    // The bot must never reel faster than this. Hardcoded on purpose so no config edit,
    // speed preset, or stale saved settings can ever alter it.
    //   reel = base + tier x perLevel  (humanized), hard-capped under the game's ~30s timer
    //   Tier 0 ~4-5.5s ... Tier 10 ~14-19.5s ... Tier 11/BAF ~15-20s
    const REEL_BASE = { min: 4000, max: 5500 };
    const REEL_PER_LEVEL = { min: 1000, max: 1400 };
    const REEL_CAP = 28000; // game holds the minigame ~30s; stay safely under
    // ============================================================================

    // ---------------------------------------------------------------------------------
    //  Runtime state
    // ---------------------------------------------------------------------------------
    let enabled = false,
        playerLocation = {},
        request = {},
        npcList = {},
        pcbangBanker = null,
        scrollsInCooldown = false,
        cooldownTimer = null,
        endSellingTimer = null,
        lastRecipe = null,
        sellItemsCount = 0,
        idleCheckTimer = null;
    let DEBUG = false;
    let hooks = [];
    let fishingMapped = true;
    let fishingCounter = 1; // [>=88] mirrors the client's real cast sequence counter
    let minigameCounter = null; // [>=88] last confirmed-good C_START sequence counter (null = unknown)
    let lastStartUnk = null;    // [>=88] the unk token the client sends with C_START_FISHING_MINIGAME
    let calGuess = 1;           // [>=88] current counter guess while auto-calibrating
    let calTries = 0;           // [>=88] failed auto-calibration attempts in a row
    let awaitingStart = false;  // [>=88] a bot C_START is in flight, awaiting catch/cancel
    let lastSentStart = null;   // [>=88] counter value of the in-flight bot C_START
    let startSafetyTimer = null;
    let sniffFishing = false, sniffTimer = null; // diagnostic packet sniffer
    let dismantleIds = new Set();                 // fish IDs flagged dismantle=1 in the settings table

    let extendedFunctions = {
        'banker': { 'C_PUT_WARE_ITEM': false },
        'seller': { 'C_STORE_SELL_ADD_BASKET': false, 'S_STORE_BASKET': false, 'C_STORE_COMMIT': false },
    };
    let dismantle_contract_type = (mod.majorPatchVersion >= 85 ? 90 : 89);

    // Stats (legacy per-fish timing array kept for "time per fish", plus richer session stats)
    let statistic = [], startTime = null, endTime = null, lastLevel = null;
    let stats = freshStats();

    // [C] Break / [E] auto-stop scheduling
    let breakTimer = null, onBreak = false, autostopTimer = null, clockTimer = null;

    // [B] Config now lives in the toolbox settings system (per-character profile).
    let config = null, activeKey = null;
    if (!mod.settings || typeof mod.settings !== 'object')
        mod.settings = { profiles: {} };
    if (!mod.settings.profiles)
        mod.settings.profiles = {};

    // Make the mod SELF-CONTAINED: register our bundled packet definitions into the live
    // protocol. This build loads defs only from data/definitions (not a mod's own defs/
    // folder), so without this the fishing packets are undefined on a fresh install and
    // nothing auto-fishes. Done per connection; overwrite=false so bundled defs win.
    ensureDefs();

    // Credit banner (console, once per connection).
    mod.log(`v${mod.info.version} by czentovic-tr (orig. SoliaRdi) | https://github.com/czentovic-tr`);

    // [Asura fix] C_RQ_ADD_ITEM_TO_DECOMPOSITION_CONTRACT is NOT in the toolbox padding
    // table, so the proxy doesn't add the required 8-byte counter+unk prefix and the server
    // rejects the add -> "menu opens but items aren't placed". Mark the opcode as padded and
    // recompile its def so the proxy fills the prefix (same path that makes C_USE_ITEM work).
    enableContractPadding();

    // ---------------------------------------------------------------------------------
    //  Lifecycle
    // ---------------------------------------------------------------------------------
    try {
        mod.game.initialize(['inventory']);
    } catch (e) {
        mod.error('Failed to initialize tera-game-state inventory module:', e);
    }

    mod.game.on('enter_game', () => {
        try {
            activeKey = `${mod.game.me.name}-${mod.game.serverId}`;
            if (!mod.settings.profiles[activeKey])
                mod.settings.profiles[activeKey] = {};
            config = mod.settings.profiles[activeKey];
            applyDefaults(config);
            ensureDismantleTable(config); // auto-build/extend the per-fish dismantle list
            rebuildDismantleSet();

            // Detect optional (banker/seller) packet availability for this protocol.
            for (let type in extendedFunctions) {
                for (let opcode in extendedFunctions[type]) {
                    let mapped = mod.dispatch.protocolMap.name.get(opcode);
                    extendedFunctions[type][opcode] = (mapped !== undefined && mapped !== null);
                }
            }
            if (config.filetmode === 'bank' && Object.values(extendedFunctions.banker).some(x => !x)) {
                config.filetmode = false;
                mod.command.message('C_PUT_WARE_ITEM not mapped, banker functions disabled.');
            }
            if (config.filetmode === 'sellscroll' && Object.values(extendedFunctions.seller).some(x => !x)) {
                config.filetmode = false;
                mod.command.message('Seller packets not mapped, sellscroll functions disabled.');
            }

            // [B] Startup guard: warn loudly (and block enabling) if core packets are missing.
            checkFishingPackets();
        } catch (e) {
            mod.error(e);
        }
    });

    mod.game.on('leave_game', () => {
        enabled = false;
        clearBreakTimers();
        clearAutostop();
        mod.clearAllTimeouts();
        mod.clearAllIntervals();
    });

    this.destructor = () => {
        clearBreakTimers();
        clearAutostop();
        mod.clearAllTimeouts();
        mod.clearAllIntervals();
    };

    // ---------------------------------------------------------------------------------
    //  Hook helpers  [B] - tolerate version mismatches across patches
    // ---------------------------------------------------------------------------------
    // Temporary hook (added on enable, removed on disable). Falls back to '*' if the
    // requested version is not defined for this server's protocol.
    function hook(name, version, ...rest) {
        let h = mod.tryHook(name, version, ...rest);
        if (!h && version !== '*' && version !== 'raw') {
            h = mod.tryHook(name, '*', ...rest);
            if (h) console.log(`auto-fishing| ${name} v${version} unavailable, using latest ('*').`);
        }
        if (!h) console.log(`auto-fishing| WARNING: could not hook ${name} (v${version}).`);
        else hooks.push(h);
        return h;
    }

    // Permanent hook (lives for the whole connection). Same fallback, never throws.
    function permHook(name, version, ...rest) {
        let h = mod.tryHook(name, version, ...rest);
        if (!h && version !== '*' && version !== 'raw')
            h = mod.tryHook(name, '*', ...rest);
        if (!h) console.log(`auto-fishing| WARNING: failed to register permanent hook ${name} (v${version}).`);
        return h;
    }

    function checkFishingPackets() {
        const map = mod.dispatch.protocolMap.name;
        let missing = REQUIRED_PACKETS.filter(p => {
            let code = map.get(p);
            return code === undefined || code === null;
        });
        fishingMapped = (missing.length === 0);
        if (!fishingMapped) {
            mod.command.message(`Auto-Fishing: ${missing.length} required packet(s) NOT mapped for this server (patch ${mod.majorPatchVersion}.${mod.minorPatchVersion}):`);
            mod.command.message(missing.join(', '));
            mod.command.message('Add these opcodes to data/opcodes for your protocol version, then reload. See /8 fish info.');
            console.log(`auto-fishing| MISSING PACKETS (${mod.majorPatchVersion}.${mod.minorPatchVersion}): ${missing.join(', ')}`);
        } else if (DEBUG) {
            mod.command.message('Auto-Fishing: all required fishing packets mapped OK.');
        }
    }

    function toggleHooks() {
        // [B] Refuse to start if the protocol mapping is incomplete.
        if (!enabled && !fishingMapped) {
            mod.command.message('Cannot enable: required fishing packets are not mapped (see /8 fish info).');
            return;
        }

        enabled = !enabled;
        mod.clearAllTimeouts();

        if (enabled) {
            mod.command.message('Auto fishing activated. Manually start fishing now.');
            if (mod.majorPatchVersion >= 88)
                mod.command.message('Auto-calibrating the fishing counter - just cast and let it run.');
            // reset in-flight calibration state for a clean session
            awaitingStart = false; calTries = 0;

            hook('S_FISHING_BITE', 1, sFishingBite);
            hook('S_START_FISHING_MINIGAME', 1, sStartFishingMinigame);
            hook('S_FISHING_CATCH', 1, sFishingCatch);
            hook('S_FISHING_CATCH_FAIL', 1, sFishingCatchFail);
            hook('S_SYSTEM_MESSAGE', 1, sSystemMessage);
            hook('S_REQUEST_CONTRACT', 1, sRequestContract);
            hook('S_CANCEL_CONTRACT', 1, sCancelContract);
            hook('S_END_PRODUCE', 1, sEndProduce);
            hook('S_DIALOG', 2, sDialog);
            if (!Object.values(extendedFunctions.seller).some(x => !x))
                hook('S_STORE_BASKET', 'raw', sStoreBasket);
            // (dismantle add-loop is self-driving now; no need to hook S_RP_ADD_ITEM)
            hook('S_SPAWN_NPC', 11, sSpawnNpc);
            hook('S_ABNORMALITY_BEGIN', mod.majorPatchVersion >= 86 ? 4 : 3, sAbnBegin);
            // [>=88] cast/minigame counters are captured by permanent RAW hooks, not here.

            // session bookkeeping + scheduling
            stats = freshStats();
            stats.sessionStart = Date.now();
            statistic = []; startTime = null; endTime = null; lastLevel = null;
            scheduleBreak();
            scheduleAutostop();
            // dismantle any already-marked fish sitting in the bag right now
            if (config.dismantle && config.dismantle.enabled)
                mod.setTimeout(() => { if (enabled) sweepDismantle(null); }, rng(config.time.contract));
        } else {
            // [B] Proper unhook (the original left holes in the array).
            for (const h of hooks) {
                if (h) mod.unhook(h);
            }
            hooks = [];
            clearBreakTimers();
            clearAutostop();
            mod.command.message('Auto fishing deactivated.');
        }
    }

    // ---------------------------------------------------------------------------------
    //  Temporary hooks (active only while enabled)
    // ---------------------------------------------------------------------------------
    // [>=88] Cast/minigame counters are captured via RAW permanent hooks (see below) so
    // the client's own packets are never re-serialized/corrupted. No def-based hook or
    // tampering on those outgoing packets.

    function sAbnBegin(event) {
        if (mod.game.me.is(event.target)) {
            switch (request.action) {
                case 'usesalad':
                    if (event.id == 70261)
                        mod.setTimeout(makeDecision, rng(config.time.bait));
                    break;
                case 'usebait':
                    if (Object.keys(BAITS).includes(event.id.toString()))
                        mod.setTimeout(makeDecision, rng(config.time.bait));
                    break;
            }
        }
    }

    function sSpawnNpc(event) {
        switch (request.action) {
            case 'bank':
                if (event.relation == 12 && event.templateId == TEMPLATE_BANKER && mod.game.me.is(event.owner)) {
                    request.banker = event;
                    mod.setTimeout(() => contactToNpc(request.banker.gameId), rng(3000, 5000));
                }
                break;
            case 'sellscroll':
                if (event.relation == 12 && TEMPLATE_SELLER.includes(event.templateId) && mod.game.me.is(event.owner)) {
                    request.seller = event;
                    mod.setTimeout(() => contactToNpc(request.seller.gameId), rng(3000, 5000));
                }
                break;
        }
    }

    function sRpAddItem(event) {
        flog('S->C S_RP_ADD_ITEM_TO_DECOMPOSITION (server confirmed an item)', { action: request.action });
        if (request.action == 'dismantle') {
            if (request.fishes.length > 0)
                mod.setTimeout(dismantleFish, rng(config.time.dismantle));
            else
                mod.setTimeout(commitDecomposition, 300);
        }
    }

    function sFishingBite(event) {
        flog('S->C S_FISHING_BITE', { gameId: String(event.gameId), rodId: event.rodId, isMe: mod.game.me.is(event.gameId) });
        if (!mod.game.me.is(event.gameId)) return;

        if (mod.majorPatchVersion >= 88) {
            // [>=88 / Asura] Sending C_START_FISHING_MINIGAME makes the server auto-catch
            // the fish ~3-4s later (instant minigame); no C_END needed. Each fishing packet
            // type has its OWN server-validated sequence counter that we can't derive from
            // the cast. We AUTO-CALIBRATE: send a guess, then watch for S_FISHING_CATCH
            // (success -> lock the value) or SMT_FISHING_RESULT_CANCLE (bump & retry). Once
            // locked we just keep using lastGood+1. A real manual start (raw hook) seeds it
            // instantly if the search struggles.
            const counter = (minigameCounter != null) ? (minigameCounter + 1) : calGuess;
            const unk = (lastStartUnk != null) ? lastStartUnk : 0;
            mod.setTimeout(() => {
                awaitingStart = true;
                lastSentStart = counter;
                mod.send('C_START_FISHING_MINIGAME', 2, { counter, unk });
                flog('C->S C_START_FISHING_MINIGAME (bot)', { counter, unk, calibrated: minigameCounter != null });
                // safety: if neither catch nor cancel arrives, recover and retry
                mod.clearTimeout(startSafetyTimer);
                startSafetyTimer = mod.setTimeout(() => {
                    if (awaitingStart) { awaitingStart = false; flog('start timed out, retrying'); makeDecision(); }
                }, 12000);
            }, rng(config.time.stMinigame));
            return;
        }

        // <88 legacy flow
        mod.setTimeout(() => {
            mod.send('C_START_FISHING_MINIGAME', 1, { counter: fishingCounter, unk: 15 });
            flog('C->S C_START_FISHING_MINIGAME (sent)', { counter: fishingCounter, unk: 15 });
        }, rng(config.time.stMinigame));
    }

    function sStartFishingMinigame(event) {
        flog('S->C S_START_FISHING_MINIGAME', { gameId: String(event.gameId), level: event.level, unk1: String(event.unk1), isMe: mod.game.me.is(event.gameId) });
        if (!mod.game.me.is(event.gameId)) return;
        lastLevel = event.level;

        if (mod.majorPatchVersion >= 88) {
            // [>=88 / Asura] Bypass the skill minigame (which varies each time and can't be
            // reliably replicated): claim the catch with C_END_FISHING_MINIGAME success=true,
            // exactly as the original mod did. Use the SAME counter we sent with C_START
            // (manual logs show C_END's counter == C_START's counter for the cycle).
            const cnt = (lastSentStart != null) ? lastSentStart : (minigameCounter != null ? minigameCounter : 1);
            // [anti-detect] Realistic reel time: a humanized base PLUS extra per difficulty
            // level, so a harder fish visibly takes longer to land (like a human struggling
            // with the tougher minigame) instead of every fish completing in a fixed ~4s.
            const lvl = (typeof event.level === 'number' && event.level > 0) ? event.level : 0;
            // GOLDEN reel times (locked min/max - see REEL_BASE/REEL_PER_LEVEL). The speed preset
            // only biases WHERE inside [min,max] the catch lands (fast=floor, slow=ceiling); it can
            // never go below the floor (never faster than a perfect human) or above the ceiling.
            const sp = (config && config.speed) || 'normal';
            let base = REEL_BASE.min + skewedRand(sp) * (REEL_BASE.max - REEL_BASE.min);
            let per = REEL_PER_LEVEL.min + skewedRand(sp) * (REEL_PER_LEVEL.max - REEL_PER_LEVEL.min);
            let delay = base + lvl * per;
            if (Math.random() < 0.08) delay += 500 + Math.random() * 2500; // occasional human hesitation (only adds)
            delay = Math.round(Math.min(delay, REEL_CAP));
            mod.setTimeout(() => {
                mod.send('C_END_FISHING_MINIGAME', 2, { counter: cnt, unk: 24, success: true });
                flog('C->S C_END_FISHING_MINIGAME (bot)', { counter: cnt, level: lvl, delayMs: Math.round(delay) });
            }, delay);
            return;
        }

        // <88 legacy minigame completion (send success/cancel after a delay)
        if (config.skipbaf && (event.level == 11 || (abnormalityDuration(70261) > 0 && event.level == 7))) {
            mod.setTimeout(() => {
                mod.send('C_END_FISHING_MINIGAME', 1, { counter: 1, unk: 24, success: false });
                flog('C->S C_END_FISHING_MINIGAME (skipbaf)', { counter: 1, success: false });
                mod.setTimeout(makeDecision, rng(config.time.rod));
            }, rng(8000, 10000));
        } else {
            mod.setTimeout(() => {
                mod.send('C_END_FISHING_MINIGAME', 1, { counter: 1, unk: 24, success: true });
                flog('C->S C_END_FISHING_MINIGAME', { counter: 1, success: true });
            }, rng(config.time.minigame));
        }
    }

    function sFishingCatchFail(event) {
        flog('S->C S_FISHING_CATCH_FAIL', { gameId: String(event.gameId), isMe: mod.game.me.is(event.gameId) });
        if (mod.game.me.is(event.gameId))
            mod.setTimeout(makeDecision, rng(config.time.rod));
    }

    function sFishingCatch(event) {
        flog('S->C S_FISHING_CATCH', { gameId: String(event.gameId), isMe: mod.game.me.is(event.gameId) });
        if (mod.game.me.is(event.gameId)) {
            // [>=88] our C_START produced a real catch -> the counter we sent is correct; lock it.
            if (mod.majorPatchVersion >= 88 && awaitingStart) {
                awaitingStart = false;
                mod.clearTimeout(startSafetyTimer);
                if (minigameCounter == null) { notify(`Auto-calibrated (fishing counter = ${lastSentStart}).`); flog('calibrated OK', { counter: lastSentStart }); }
                minigameCounter = lastSentStart; // advance to the value just used
                calTries = 0;
            }
            endTime = Date.now();
            if (startTime != null && lastLevel != null)
                statistic.push({ level: lastLevel, time: endTime - startTime });
            // [E] richer session stats
            stats.fish++;
            if (lastLevel != null) {
                stats.byLevel[lastLevel] = (stats.byLevel[lastLevel] || 0) + 1;
                stats.goldEst += (PRICES[Math.min(Math.max(lastLevel - 1, 0), PRICES.length - 1)] || 0);
            }
            startTime = Date.now();
            mod.setTimeout(postCatch, rng(config.time.decision));
        }
    }

    function sSystemMessage(event) {
        let message = mod.parseSystemMessage(event.message);
        // [debug] every system message id is logged - this reveals WHY fishing cancels.
        flog('S->C S_SYSTEM_MESSAGE', { id: message.id });

        // [>=88] our C_START was rejected -> wrong counter (or unk). Re-search and retry.
        if (message.id === 'SMT_FISHING_RESULT_CANCLE' && mod.majorPatchVersion >= 88 && awaitingStart) {
            awaitingStart = false;
            mod.clearTimeout(startSafetyTimer);
            const base = (lastSentStart != null) ? lastSentStart : 0;
            minigameCounter = null;   // drop the (failed) value, keep searching
            calGuess = base + 1;
            calTries += 1;
            if (calTries > 12) {
                calTries = 0;
                calGuess = 1;
                notify('Auto-calibration could not find the fishing counter. Press your fishing key ONCE to seed it (this also captures the unk token), then I will continue.');
            } else {
                flog('start rejected, retrying', { nextCounter: calGuess, try: calTries });
                mod.setTimeout(makeDecision, rng(config.time.rod));
            }
            return;
        }

        if (message.id == 'SMT_CANNOT_FISHING_NON_AREA')
            mod.setTimeout(makeDecision, rng(config.time.rod));
    }

    function sRequestContract(event) {
        switch (request.action) {
            case 'sellscroll':
            case 'selltonpc':
                if (event.type == 9) {
                    request.seller.contractId = event.id;
                    if (request.fishes.length === 0) {
                        mod.clearTimeout(endSellingTimer);
                        endSellingTimer = mod.setTimeout(() => cancelContract(9, request.seller.contractId), 5000);
                    } else {
                        mod.setTimeout(sellFish, rng(config.time.sell));
                    }
                }
                break;
            case 'bank':
                if (event.type == 26) {
                    request.banker.contractId = event.id;
                    bankFillets();
                }
                break;
            case 'dismantle':
                flog('S->C S_REQUEST_CONTRACT', { type: event.type, id: event.id, expected: dismantle_contract_type, match: event.type == dismantle_contract_type });
                if (event.type == dismantle_contract_type) {
                    request.contractId = event.id;
                    dismantleFish();
                }
                break;
        }
    }

    function sCancelContract(event) {
        switch (request.action) {
            case 'sellscroll':
            case 'selltonpc':
                if (event.type == 9 && request.seller.contractId == event.id)
                    mod.setTimeout(makeDecision, rng(config.time.contract));
                break;
            case 'bank':
                if (event.type == 26 && request.banker.contractId == event.id)
                    mod.setTimeout(makeDecision, rng(config.time.contract));
                break;
            case 'dismantle':
                if (event.type == dismantle_contract_type && request.contractId == event.id)
                    mod.setTimeout(continueDismantle, rng(config.time.contract)); // loop: dismantle more, or run continuation
                break;
        }
    }

    function sEndProduce(event) {
        if (request.action == 'craft' && event.success) {
            stats.baitsCrafted += 10; // one craft == 10 baits
            mod.setTimeout(makeDecision, rng(config.time.contract));
        }
    }

    function sDialog(event) {
        switch (request.action) {
            case 'bank':
                if (event.gameId == request.banker.gameId) {
                    request.banker.dialogId = event.id;
                    mod.setTimeout(() => {
                        mod.send('C_DIALOG', 1, { id: request.banker.dialogId, index: 1, questReward: -1, unk: -1 });
                    }, rng(config.time.dialog));
                }
                break;
            case 'sellscroll':
            case 'selltonpc':
                if (event.gameId == request.seller.gameId) {
                    request.seller.dialogId = event.id;
                    mod.setTimeout(() => {
                        mod.send('C_DIALOG', 1, { id: request.seller.dialogId, index: 1, questReward: -1, unk: -1 });
                    }, rng(config.time.dialog));
                }
                break;
        }
    }

    function sStoreBasket() {
        switch (request.action) {
            case 'sellscroll':
            case 'selltonpc':
                if (request.fishes.length > 0 && sellItemsCount < 7) {
                    sellItemsCount++;
                    mod.setTimeout(sellFish, rng(config.time.sell));
                    if (request.fishes.length < 8) {
                        mod.clearTimeout(endSellingTimer);
                        endSellingTimer = mod.setTimeout(() => cancelContract(9, request.seller.contractId), 10000);
                    }
                } else {
                    mod.setTimeout(() => {
                        if (sellItemsCount > 0) {
                            sellFishes();
                        } else {
                            mod.clearTimeout(endSellingTimer);
                            endSellingTimer = mod.setTimeout(() => cancelContract(9, request.seller.contractId), 1000);
                        }
                    }, 300);
                }
                break;
        }
    }

    // ---------------------------------------------------------------------------------
    //  Permanent hooks
    // ---------------------------------------------------------------------------------
    permHook('C_START_PRODUCE', 1, event => { lastRecipe = event.recipe; });

    // [>=88] RAW capture of the fishing counters. Raw hooks forward the original bytes
    // untouched (we return nothing), so the client's real C_CAST / C_START packets reach
    // the server intact. counter is the first field -> uint32 LE at offset 4 (after the
    // 4-byte packet header). We only READ it.
    permHook('C_CAST_FISHING_ROD', 'raw', (code, data) => {
        try { fishingCounter = data.readUInt32LE(4); } catch (_) {}
        flog('C->S C_CAST_FISHING_ROD (raw)', { counter: fishingCounter });
    });
    permHook('C_START_FISHING_MINIGAME', 'raw', (code, data, incoming, fake) => {
        if (fake) return; // ignore our own injected sends; only learn from the real client
        try { minigameCounter = data.readUInt32LE(4); lastStartUnk = data.readUInt32LE(8); } catch (_) {}
        flog('C->S C_START_FISHING_MINIGAME (client,raw)', { counter: minigameCounter, unk: lastStartUnk });
    });
    // Diagnostic: capture the counter (and success byte) the client uses to END the
    // minigame during a real manual catch. Layout: counter@4, unk@8, success@12.
    permHook('C_END_FISHING_MINIGAME', 'raw', (code, data) => {
        let c = null, s = null;
        try { c = data.readUInt32LE(4); if (data.length >= 13) s = data.readUInt8(12); } catch (_) {}
        flog('C->S C_END_FISHING_MINIGAME (client,raw)', { counter: c, success: s });
    });

    // Diagnostic sniffer: when armed via "/8 fish sniff", logs every outgoing client
    // packet (minus movement/ping noise) so we can identify the reel / F-press packet
    // used by the fishing minigame. Cheap when disarmed (early return).
    const SNIFF_SKIP = new Set([
        'C_PLAYER_LOCATION', 'C_PLAYER_FLYING_LOCATION', 'C_NOTIFY_LOCATION_IN_ACTION',
        'C_REQUEST_GAMESTAT_PING', 'C_CHAT', 'C_WHISPER', 'C_GUILD_CHAT'
    ]);
    permHook('*', 'raw', (code, data, incoming, fake) => {
        if (!sniffFishing || fake || incoming) return;
        let name = mod.dispatch.protocolMap.code.get(code) || ('#' + code);
        if (SNIFF_SKIP.has(name)) return;
        let hex = '';
        try { hex = data.slice(4, Math.min(data.length, 28)).toString('hex'); } catch (_) {}
        flog('SNIFF C->S ' + name, { len: data.length, payload: hex });
    });

    permHook('S_SPAWN_NPC', 11, event => {
        if (TEMPLATE_SELLER.includes(event.templateId) ||
            (TEMPLATE_BANKER == event.templateId && event.owner === 0n) ||
            mod.game.me.is(event.owner)) {
            npcList[event.gameId] = event;
        }
    });

    permHook('S_DESPAWN_NPC', 3, event => { delete npcList[event.gameId]; });

    permHook('S_SPAWN_USER', 15, event => {
        if (event.gm && enabled)
            handleGmNearby();
    });

    permHook('S_PREMIUM_SLOT_DATALIST', 2, event => {
        for (let set of event.sets) {
            for (let inven of set.inventory) {
                if (ITEMS_BANKER.includes(inven.item))
                    pcbangBanker = { set: set.id, slot: inven.slot, type: inven.type, id: inven.id };
            }
        }
    });

    permHook('S_START_COOLTIME_ITEM', 1, event => {
        if ((ITEMS_BANKER.includes(event.item) || ITEMS_SELLER.includes(event.item)) && event.cooldown > 0 && !scrollsInCooldown) {
            scrollsInCooldown = true;
            // [B] use the tracked timer so it is cleared on unload / leave_game
            mod.clearTimeout(cooldownTimer);
            cooldownTimer = mod.setTimeout(() => { scrollsInCooldown = false; }, event.cooldown * 1000);
        }
    });

    permHook('C_PLAYER_LOCATION', 5, event => { playerLocation = event; });

    permHook('S_LOAD_TOPO', 3, event => {
        playerLocation.loc = event.loc;
        playerLocation.w = 0;
        if (enabled && !onBreak)
            mod.clearAllTimeouts();
    });

    permHook('C_RETURN_TO_LOBBY', 1, () => { if (enabled) mod.clearAllTimeouts(); });
    permHook('S_EXIT', 3, () => { if (enabled) mod.clearAllTimeouts(); });

    // ----- Abnormality tracking -----
    let abnormalities = {};
    permHook('S_ABNORMALITY_BEGIN', mod.majorPatchVersion >= 86 ? 4 : 3, event => {
        if (mod.game.me.is(event.target))
            abnormalities[event.id] = Date.now() + Number.parseInt(event.duration);
    });
    permHook('S_ABNORMALITY_REFRESH', mod.majorPatchVersion >= 86 ? 2 : 1, event => {
        if (mod.game.me.is(event.target))
            abnormalities[event.id] = Date.now() + Number.parseInt(event.duration);
    });
    permHook('S_ABNORMALITY_END', 1, event => {
        if (mod.game.me.is(event.target))
            delete abnormalities[event.id];
    });
    function abnormalityDuration(id) {
        if (!abnormalities[id]) return 0;
        return abnormalities[id] - Date.now();
    }

    // ---------------------------------------------------------------------------------
    //  [C] GM detection
    // ---------------------------------------------------------------------------------
    function handleGmNearby() {
        // React after a short, randomized human-like delay rather than instantly.
        mod.setTimeout(() => {
            switch (config.gmmode) {
                case 'exit':
                    notify('GM is near you - exiting game.');
                    if (enabled) toggleHooks();
                    mod.toClient('S_EXIT', 3, { category: 0, code: 0 });
                    break;
                case 'lobby':
                    notify('GM is near you - returning to lobby.');
                    if (enabled) toggleHooks();
                    mod.toServer('C_RETURN_TO_LOBBY', 1, {});
                    break;
                case 'stop':
                    notify('GM is near you - fishing stopped.');
                    if (enabled) toggleHooks();
                    break;
                default:
                    notify('Warning: GM is near you.');
                    break;
            }
        }, rng(800, 2600));
    }

    // ---------------------------------------------------------------------------------
    //  Decision engine
    // ---------------------------------------------------------------------------------
    // Runs right after a catch: instantly dismantle any caught fish flagged in the table,
    // then fall through to the normal decision (bait/rod/craft).
    let dismantleThen = null; // continuation to run once a dismantle sweep finishes

    // Dismantle ALL currently-marked fish in the bag - whether just caught OR already
    // sitting in the inventory - in batches of 20, looping until none remain, then run `then`.
    function sweepDismantle(then) {
        dismantleThen = (typeof then === 'function') ? then : null;
        continueDismantle();
    }
    function continueDismantle() {
        if (dismantleIds && dismantleIds.size > 0) {
            const marked = mod.game.inventory.findAllInBagOrPockets([...dismantleIds]);
            if (marked && marked.length > 0) {
                if (DEBUG) mod.command.message(`Dismantling ${Math.min(marked.length, 20)}/${marked.length} marked fish.`);
                request = { action: 'dismantle', fishes: marked.slice(0, 20) };
                processDecision();
                return;
            }
        }
        const cb = dismantleThen; dismantleThen = null;
        if (cb) cb();
    }

    function postCatch() {
        if (onBreak) return;
        sweepDismantle(makeDecision); // clear marked fish (caught + any leftovers), then decide next
    }

    function makeDecision() {
        if (onBreak) return; // [C] suspended during a scheduled break
        mod.clearTimeout(idleCheckTimer);
        idleCheckTimer = mod.setTimeout(makeDecision, 300 * 1000);

        let action = 'userod';
        request = {};
        let filets = mod.game.inventory.findInBagOrPockets(FILET_ID);
        let bait = mod.game.inventory.findInBagOrPockets(Object.values(BAITS));
        let salad = mod.game.inventory.findInBagOrPockets(ITEMS_SALAD);

        // [new] Marked fish are dismantled instantly on catch (see postCatch), so only KEPT
        // fish accumulate. When the bag is nearly full of keepers -> stop & notify (user choice).
        if (mod.game.inventory.bag.size - mod.game.inventory.bagItems.length <= 3) {
            notify('Inventory almost full of kept fish - stopping. Sell/store them, then /8 fish to resume.');
            if (enabled) toggleHooks();
            return;
        }

        if (config.autosalad && abnormalityDuration(70261) <= 0 && salad !== undefined) {
            action = 'usesalad';
        } else if (filets !== undefined && filets.amount >= 9000 && config.filetmode === 'bank') {
            action = 'toomanyfilets';
        } else if (bait !== undefined) {
            action = (Object.keys(BAITS).every(el => abnormalityDuration(Number(el)) <= 0)) ? 'usebait' : 'userod';
        } else if (filets !== undefined && filets.amount >= 60) {
            action = 'craft'; // out of bait -> craft more from filets
        } else {
            action = 'userod'; // out of bait, not enough filets yet -> keep fishing (dismantles build filets up)
        }

        switch (action) {
            case 'toomanyfilets': {
                switch (config.filetmode) {
                    case 'bank': {
                        action = 'bank';
                        if (scrollsInCooldown) {
                            mod.setTimeout(makeDecision, 60 * 1000);
                            action = 'wait';
                        } else if (pcbangBanker == null) {
                            let scroll = mod.game.inventory.findInBagOrPockets(ITEMS_BANKER);
                            if (scroll === undefined) {
                                notify('ERROR: no banker scroll found.');
                                action = 'aborted';
                            } else {
                                request = { scroll: scroll, filets: filets };
                            }
                        } else {
                            request = { slot: pcbangBanker, filets: filets };
                        }
                        break;
                    }
                    default:
                        notify('ERROR: no action for toomanyfilets.');
                        action = 'aborted';
                        break;
                }
                break;
            }
            case 'userod': {
                request = { rod: mod.game.inventory.findInBagOrPockets(flatSingle(ITEMS_RODS)) };
                if (request.rod === undefined) {
                    notify('ERROR: no fishing rod found.');
                    action = 'aborted';
                }
                break;
            }
            case 'usesalad':
                request = { salad: salad };
                break;
            case 'usebait':
                request = { bait: bait };
                break;
            case 'craft': {
                if (config.recipe === undefined) {
                    notify('ERROR: no crafting recipe set (use /8 fish setrecipe).');
                    action = 'aborted';
                } else {
                    request = { recipe: config.recipe };
                }
                break;
            }
        }

        if (DEBUG)
            mod.command.message(`Decision: ${action}`);
        request.action = action;
        processDecision();
    }

    function processDecision() {
        switch (request.action) {
            case 'dismantle':
                mod.setTimeout(() => requestContract(dismantle_contract_type), rng(config.time.contract));
                break;
            case 'usebait':
                mod.setTimeout(() => useItem(request.bait), rng(config.time.bait));
                break;
            case 'userod':
                mod.setTimeout(() => useItem(request.rod), rng(config.time.rod));
                break;
            case 'usesalad':
                mod.setTimeout(() => useItem(request.salad), rng(config.time.bait));
                break;
            case 'bank':
                mod.setTimeout(() => {
                    if (request.slot !== undefined) useSlot(request.slot);
                    else useItem(request.scroll);
                }, rng(config.time.rod));
                break;
            case 'selltonpc':
                mod.setTimeout(() => contactToNpc(request.seller.gameId), rng(config.time.rod));
                break;
            case 'sellscroll':
                mod.setTimeout(() => useItem(request.scroll), rng(config.time.rod));
                break;
            case 'craft':
                mod.setTimeout(startCraft, rng(config.time.contract));
                break;
            case 'aborted':
                toggleHooks();
                break;
        }
    }

    // ---------------------------------------------------------------------------------
    //  Senders
    // ---------------------------------------------------------------------------------
    function bankFillets() {
        let amount = (config.bankAmount > request.filets.amount ? request.filets.amount : config.bankAmount) - 150;
        if (mod.majorPatchVersion >= 85) {
            mod.send('C_PUT_WARE_ITEM', 3, {
                gameId: mod.game.me.gameId, type: 1, page: 0,
                pocket: request.filets.pocket, invenPos: request.filets.slot,
                id: request.filets.id, dbid: request.filets.dbid, amount: amount,
            });
        } else {
            mod.send('C_PUT_WARE_ITEM', 2, {
                gameId: mod.game.me.gameId, type: 1, page: 0,
                invenPos: request.filets.slot + 40, dbid: request.filets.id,
                uid: request.filets.dbid, amont: amount,
            });
        }
        stats.filetsBanked += Math.max(0, amount);
        mod.setTimeout(() => cancelContract(26, request.banker.contractId), 5000);
    }

    function sellFishes() {
        sellItemsCount = 0;
        mod.send('C_STORE_COMMIT', 1, { gameId: mod.game.me.gameId, contract: request.seller.contractId });
    }

    function useItem(item) {
        mod.send('C_USE_ITEM', 3, {
            gameId: mod.game.me.gameId, id: item.id, dbid: item.dbid,
            amount: 1, loc: playerLocation.loc, w: playerLocation.w, unk4: true,
        });
    }

    function useSlot(slot) {
        mod.send('C_USE_PREMIUM_SLOT', 1, slot);
    }

    function contactToNpc(gameId) {
        mod.send('C_NPC_CONTACT', 2, { gameId: gameId });
    }

    function sellFish() {
        let fish = request.fishes.shift();
        if (fish != undefined) {
            stats.fishSold++;
            if (mod.majorPatchVersion >= 85) {
                mod.send('C_STORE_SELL_ADD_BASKET', 2, {
                    cid: mod.game.me.gameId, npc: request.seller.contractId,
                    item: fish.id, quantity: 1, pocket: fish.pocket, slot: fish.slot,
                });
            } else {
                mod.send('C_STORE_SELL_ADD_BASKET', 1, {
                    cid: mod.game.me.gameId, npc: request.seller.contractId,
                    item: fish.id, quantity: 1, slot: fish.slot + 40,
                });
            }
        } else {
            mod.clearTimeout(endSellingTimer);
            endSellingTimer = mod.setTimeout(() => cancelContract(9, request.seller.contractId), 1000);
        }
    }

    // Self-driving: add each marked fish into the contract with a humanized gap, then commit.
    // (Does not wait for S_RP_ADD_ITEM, so it doesn't depend on parsing the server reply.)
    function dismantleFish() {
        const fish = request.fishes.shift();
        if (fish === undefined) {
            mod.setTimeout(commitDecomposition, rng(config.time.dismantle));
            return;
        }
        flog('C->S C_RQ_ADD_ITEM (bot)', { contract: request.contractId, itemid: fish.id, dbid: String(fish.dbid) });
        mod.send('C_RQ_ADD_ITEM_TO_DECOMPOSITION_CONTRACT', 1, {
            contract: request.contractId, dbid: fish.dbid, itemid: fish.id, amount: 1,
        });
        mod.setTimeout(dismantleFish, rng(config.time.dismantle));
    }

    function commitDecomposition() {
        mod.send('C_RQ_COMMIT_DECOMPOSITION_CONTRACT', 1, { contract: request.contractId });
        // close the now-emptied contract shortly after so the dismantle loop continues quickly
        mod.setTimeout(() => cancelContract(dismantle_contract_type, request.contractId), rng(1200, 2000));
    }

    function requestContract(type) {
        mod.send('C_REQUEST_CONTRACT', 1, { type: type });
    }

    function cancelContract(type, id) {
        mod.send('C_CANCEL_CONTRACT', 1, { type: type, id: id });
    }

    function startCraft() {
        mod.send('C_START_PRODUCE', 1, { recipe: request.recipe });
    }

    // ---------------------------------------------------------------------------------
    //  [C] Break scheduling  /  [E] auto-stop
    // ---------------------------------------------------------------------------------
    function scheduleBreak() {
        clearBreakTimers();
        if (!config.breaks || !config.breaks.enabled) return;
        let mins = rng(config.breaks.fishMin, config.breaks.fishMax);
        breakTimer = mod.setTimeout(startBreak, mins * 60000);
        if (DEBUG) mod.command.message(`Next break in ~${mins} min.`);
    }

    function startBreak() {
        if (!enabled) return;
        onBreak = true;
        mod.clearAllTimeouts(); // stop the active fishing chain
        let mins = rng(config.breaks.idleMin, config.breaks.idleMax);
        notify(`Taking a break for ~${mins} min.`);
        breakTimer = mod.setTimeout(endBreak, mins * 60000); // set AFTER clearAllTimeouts
    }

    function endBreak() {
        if (!enabled) return;
        onBreak = false;
        notify('Break over - resuming fishing.');
        scheduleBreak();
        makeDecision();
    }

    function clearBreakTimers() {
        if (breakTimer) { mod.clearTimeout(breakTimer); breakTimer = null; }
        onBreak = false;
    }

    function scheduleAutostop() {
        clearAutostop();
        if (!config.autostop) return;
        if (config.autostop.afterMinutes > 0) {
            autostopTimer = mod.setTimeout(() => {
                notify('Auto-stop: time limit reached.');
                if (enabled) toggleHooks();
            }, config.autostop.afterMinutes * 60000);
        }
        if (config.autostop.dailyTime) {
            clockTimer = mod.setInterval(() => {
                let now = new Date();
                let hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                if (hhmm === config.autostop.dailyTime) {
                    notify(`Auto-stop: daily time ${config.autostop.dailyTime} reached.`);
                    if (enabled) toggleHooks();
                }
            }, 60000);
        }
    }

    function clearAutostop() {
        if (autostopTimer) { mod.clearTimeout(autostopTimer); autostopTimer = null; }
        if (clockTimer) { mod.clearInterval(clockTimer); clockTimer = null; }
    }

    // ---------------------------------------------------------------------------------
    //  Helpers
    // ---------------------------------------------------------------------------------
    function freshStats() {
        return { sessionStart: null, fish: 0, byLevel: {}, baitsCrafted: 0, filetsBanked: 0, fishSold: 0, goldEst: 0 };
    }

    // Register the mod's bundled defs/*.def into the live protocol (self-contained install).
    function ensureDefs() {
        const proto = mod.dispatch && mod.dispatch.protocol;
        if (!proto || typeof proto.parseDefinition !== 'function' || typeof mod.dispatch.addDefinition !== 'function') {
            mod.warn('auto-fishing: cannot self-register packet defs on this toolbox - copy the defs/ files into <toolbox>/data/definitions manually.');
            return;
        }
        let defDir = path.join(__dirname, 'defs');
        let files;
        try { files = fs.readdirSync(defDir); } catch (e) { return; }
        let added = 0;
        for (const file of files) {
            const m = file.match(/^(.+)\.(\d+)\.def$/);
            if (!m) continue;
            const name = m[1], version = parseInt(m[2], 10);
            const existing = proto.messages && proto.messages.get(name);
            if (existing && existing.get(version)) continue; // already provided by data.json / data folder
            try {
                const parsed = proto.parseDefinition(path.join(defDir, file));
                mod.dispatch.addDefinition(name, version, parsed, false); // false = never override a bundled def
                added++;
            } catch (e) {
                mod.warn(`auto-fishing: failed to register def ${file}: ${e.message}`);
            }
        }
        if (added) mod.log(`registered ${added} bundled packet definition(s).`);
    }

    function notify(msg) {
        let who = (mod.game && mod.game.me) ? mod.game.me.name : '';
        console.log(`auto-fishing(${who})| ${msg}`);
        if (config && config.notify !== false)
            mod.command.message(msg);
        if (config && config.logfile)
            appendLog(msg);
    }

    function appendLog(msg) {
        try {
            fs.appendFileSync(path.join(__dirname, 'auto-fishing.log'), `[${new Date().toISOString()}] ${msg}\n`);
        } catch (_) { /* mod folder may be read-only when toolbox isn't elevated */ }
    }

    // Verbose packet trace, only when DEBUG is on. Writes to console AND
    // mods/auto-fishing/auto-fishing-debug.log so the raw flow can be inspected.
    function flog(tag, obj) {
        if (!DEBUG) return;
        let line = `${tag}${obj ? ' ' + JSON.stringify(obj) : ''}`;
        console.log(`auto-fishing| ${line}`);
        try {
            fs.appendFileSync(path.join(__dirname, 'auto-fishing-debug.log'), `[${new Date().toISOString()}] ${line}\n`);
        } catch (_) { /* read-only fallback */ }
    }

    function getItemIdChatLink(chatLink) {
        let id = (chatLink || '').match(/#(\d*)@/);
        return id ? parseInt(id[1]) : null;
    }

    function findClosestNpc() {
        let npc = Object.values(npcList).filter(x => TEMPLATE_SELLER.includes(x.templateId));
        for (let i = npc.length; i-- > 0;) npc[i].distance = npc[i].loc.dist3D(playerLocation.loc);
        return npc.reduce((result, obj) => (!(obj.distance > result.distance)) ? obj : result, {});
    }

    // Build / extend the per-fish dismantle table in config. Auto-adds any fish missing
    // from the list (incl. future patches). Default: dismantle tiers 0-8, KEEP tiers 9,10,BAF.
    function ensureDismantleTable(c) {
        if (!c.dismantle || typeof c.dismantle !== 'object') c.dismantle = {};
        if (c.dismantle.enabled === undefined) c.dismantle.enabled = true;
        if (!Array.isArray(c.dismantle.list)) c.dismantle.list = [];
        const present = new Set(c.dismantle.list.map(r => r.id));
        for (let t = 0; t < ITEMS_FISHES.length; t++) {
            const tierLabel = (t === ITEMS_FISHES.length - 1) ? 'BAF' : t;
            const def = (t <= 8) ? 1 : 0; // keep tier 9, 10, BAF by default
            for (const id of ITEMS_FISHES[t]) {
                if (!present.has(id)) {
                    c.dismantle.list.push({ id, name: FISH_NAMES[id] || ('Fish ' + id), tier: tierLabel, dismantle: def });
                    present.add(id);
                }
            }
        }
    }

    // Mark C_RQ_ADD_ITEM_TO_DECOMPOSITION_CONTRACT as a "padded" packet and recompile its
    // definition, so the proxy auto-prepends the counter+unk prefix the Asura server requires.
    function enableContractPadding() {
        try {
            const map = mod.dispatch.protocolMap;
            const proto = mod.dispatch.protocol;
            const name = 'C_RQ_ADD_ITEM_TO_DECOMPOSITION_CONTRACT';
            const code = map.name.get(name);
            if (code === undefined || code === null) { mod.warn('dismantle: opcode for ' + name + ' not mapped.'); return; }
            if (map.padding[code]) return; // already padded
            map.padding[code] = true;
            const parsed = proto.parseDefinition(path.join(__dirname, 'defs', name + '.1.def'));
            mod.dispatch.addDefinition(name, 1, parsed, true); // overwrite -> recompiles WITH padding now set
            mod.log('dismantle: enabled padding for ' + name + ' (opcode ' + code + ').');
        } catch (e) {
            mod.warn('dismantle: failed to enable contract padding: ' + e.message);
        }
    }

    // Recompute the fast lookup of IDs to dismantle from the table.
    function rebuildDismantleSet() {
        dismantleIds = new Set();
        if (config && config.dismantle && config.dismantle.enabled && Array.isArray(config.dismantle.list))
            for (const r of config.dismantle.list)
                if (r.dismantle == 1) dismantleIds.add(r.id);
    }

    // /8 fish dismantle ... command handler.
    function dismantleCmd(arg, arg2, arg3) {
        if (!config) { mod.command.message('Not in game yet.'); return; }
        ensureDismantleTable(config);
        const list = config.dismantle.list;
        const setFlag = (pred, val) => { let n = 0; for (const r of list) if (pred(r)) { r.dismantle = val; n++; } return n; };
        switch (arg) {
            case undefined:
            case 'status': {
                const on = list.filter(r => r.dismantle == 1).length;
                mod.command.message(`Dismantle: ${config.dismantle.enabled ? 'ON' : 'OFF'} | dismantling ${on}/${list.length} fish, keeping ${list.length - on}.`);
                break;
            }
            case 'now': {
                if (!enabled) { mod.command.message('Enable fishing first (/8 fish) so I can run the dismantle contract.'); break; }
                const marked = mod.game.inventory.findAllInBagOrPockets([...dismantleIds]);
                if (!marked || marked.length === 0) { mod.command.message('No marked fish in your inventory.'); break; }
                mod.command.message(`Dismantling ${marked.length} marked fish now...`);
                sweepDismantle(null);
                break;
            }
            case 'on': config.dismantle.enabled = true; rebuildDismantleSet(); mod.command.message('Instant dismantle ENABLED.'); break;
            case 'off': config.dismantle.enabled = false; rebuildDismantleSet(); mod.command.message('Instant dismantle DISABLED.'); break;
            case 'allon': { const n = setFlag(() => true, 1); rebuildDismantleSet(); mod.command.message(`Marked all ${n} fish to dismantle.`); break; }
            case 'alloff': { const n = setFlag(() => true, 0); rebuildDismantleSet(); mod.command.message(`Set all ${n} fish to KEEP.`); break; }
            case 'tier': {
                const t = parseInt(arg2);
                const val = (arg3 === 'on') ? 1 : (arg3 === 'off' ? 0 : null);
                if (isNaN(t) || val === null) { mod.command.message('Usage: /8 fish dismantle tier <0-10> on|off'); break; }
                const n = setFlag(r => r.tier === t, val); rebuildDismantleSet();
                mod.command.message(`Tier ${t}: ${n} fish -> ${val ? 'dismantle' : 'keep'}.`);
                break;
            }
            case 'baf': {
                const val = (arg2 === 'on') ? 1 : (arg2 === 'off' ? 0 : null);
                if (val === null) { mod.command.message('Usage: /8 fish dismantle baf on|off'); break; }
                const n = setFlag(r => r.tier === 'BAF', val); rebuildDismantleSet();
                mod.command.message(`BAF: ${n} fish -> ${val ? 'dismantle' : 'keep'}.`);
                break;
            }
            default: {
                const id = getItemIdChatLink(arg);
                const row = (id != null) ? list.find(r => r.id === id) : null;
                if (!row) { mod.command.message('Usage: dismantle on|off | tier <n> on|off | baf on|off | allon|alloff | status | <ctrl+click a fish>'); break; }
                row.dismantle = (row.dismantle == 1) ? 0 : 1;
                rebuildDismantleSet();
                mod.command.message(`${row.name} (${id}) -> ${row.dismantle ? 'DISMANTLE' : 'keep'}.`);
                break;
            }
        }
    }

    function applyDefaults(c) {
        if (c.time === undefined) c.time = {};
        const T = c.time;
        if (T.minigame === undefined) T.minigame = { min: 4000, max: 5500 };
        if (T.stMinigame === undefined) T.stMinigame = { min: 2000, max: 4000 };
        if (T.rod === undefined) T.rod = { min: 4500, max: 5500 };
        if (T.bait === undefined) T.bait = { min: 250, max: 750 };
        if (T.sell === undefined) T.sell = { min: 150, max: 300 };
        if (T.contract === undefined) T.contract = { min: 500, max: 1000 };
        if (T.dialog === undefined) T.dialog = { min: 1500, max: 3000 };
        if (T.dismantle === undefined) T.dismantle = { min: 200, max: 400 };
        if (T.decision === undefined) T.decision = { min: 500, max: 700 };
        if (T.perLevel === undefined) T.perLevel = { min: 400, max: 650 }; // extra reel time per fish difficulty level
        if (!(c.bankAmount > 0)) c.bankAmount = 8000;
        if (!(c.contdist >= 0)) c.contdist = 6;
        if (c.blacklist === undefined) c.blacklist = [];
        if (c.gmmode === undefined) c.gmmode = 'stop';
        if (c.filetmode === undefined) c.filetmode = false;
        if (c.autosalad === undefined) c.autosalad = false;
        if (c.skipbaf === undefined) c.skipbaf = false;
        // new options
        if (c.humanize === undefined) c.humanize = true;
        if (c.speed === undefined) c.speed = 'normal'; // biases reel landing within the locked min/max
        if (c.notify === undefined) c.notify = true;
        if (c.logfile === undefined) c.logfile = false;
        if (c.breaks === undefined) c.breaks = { enabled: false, fishMin: 45, fishMax: 75, idleMin: 5, idleMax: 12 };
        if (c.autostop === undefined) c.autostop = { afterMinutes: 0, dailyTime: '' };
    }

    // [C] Speed presets - one command to retune all the human-like delays.
    function setSpeed(preset) {
        const T = config.time;
        if (preset === 'fast') {
            T.stMinigame = { min: 1500, max: 3000 }; T.minigame = { min: 3000, max: 4500 };
            T.rod = { min: 3000, max: 4500 }; T.decision = { min: 400, max: 800 }; T.perLevel = { min: 250, max: 450 };
        } else if (preset === 'slow') {
            T.stMinigame = { min: 3000, max: 6000 }; T.minigame = { min: 5000, max: 7000 };
            T.rod = { min: 7000, max: 11000 }; T.decision = { min: 800, max: 1600 }; T.perLevel = { min: 700, max: 1100 };
        } else { // normal
            T.stMinigame = { min: 2000, max: 4000 }; T.minigame = { min: 4000, max: 5500 };
            T.rod = { min: 4500, max: 6000 }; T.decision = { min: 500, max: 900 }; T.perLevel = { min: 400, max: 650 };
        }
    }

    // [UI] In-game overview of the current configuration (anti-detection + timings).
    function printSettings() {
        const T = config.time;
        mod.command.message('=== Auto-Fishing settings ===');
        mod.command.message(`humanize: ${config.humanize ? 'ON' : 'off'} | breaks: ${config.breaks.enabled ? 'ON' : 'off'} (fish ${config.breaks.fishMin}-${config.breaks.fishMax}m, idle ${config.breaks.idleMin}-${config.breaks.idleMax}m)`);
        mod.command.message(`autostop: ${config.autostop.afterMinutes > 0 ? config.autostop.afterMinutes + 'm' : 'off'}${config.autostop.dailyTime ? (' / daily ' + config.autostop.dailyTime) : ''} | gmmode: ${config.gmmode} | notify: ${config.notify ? 'on' : 'off'}`);
        mod.command.message(`reel (LOCKED): ${REEL_BASE.min / 1000}-${REEL_BASE.max / 1000}s + tier x ${REEL_PER_LEVEL.min / 1000}-${REEL_PER_LEVEL.max / 1000}s, cap ${REEL_CAP / 1000}s | speed: ${config.speed} (biases within range)`);
        mod.command.message(`timings(ms): react ${T.stMinigame.min}-${T.stMinigame.max}, recast ${T.rod.min}-${T.rod.max}, decision ${T.decision.min}-${T.decision.max}`);
        mod.command.message(`filetmode: ${config.filetmode || 'off'} | skipbaf: ${config.skipbaf ? 'on' : 'off'} | autosalad: ${config.autosalad ? 'on' : 'off'}`);
        mod.command.message('Tune fast: /8 fish speed slow|normal|fast  -  or edit config.json then /8 fish reloadconf');
    }

    // Reel-time skew per speed preset. Returns r in [0,1) used as min + r*(max-min):
    //   fast -> min of two randoms (mean ~1/3, leans to the golden floor)
    //   slow -> max of two randoms (mean ~2/3, leans to the ceiling)
    //   normal -> triangular (mean 1/2, centered).  Always within [0,1) so never below floor.
    function skewedRand(speed) {
        const a = Math.random(), b = Math.random();
        if (speed === 'fast') return Math.min(a, b);
        if (speed === 'slow') return Math.max(a, b);
        return (a + b) / 2;
    }

    // Delay generator. [C] When humanize is on, uses a triangular distribution
    // (centred, more natural than flat uniform) plus an occasional longer hesitation.
    function rng(f, s) {
        let min, max;
        if (s !== undefined) { min = f; max = s; }
        else { min = f.min; max = f.max; }
        if (max <= min) return min;
        if (config && config.humanize) {
            let r = (Math.random() + Math.random()) / 2; // triangular
            let v = min + r * (max - min);
            if (Math.random() < 0.08) v += 500 + Math.random() * 2500; // hesitation
            return Math.round(v);
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    function fmtDur(ms) {
        let s = Math.floor(ms / 1000);
        let h = Math.floor(s / 3600); s -= h * 3600;
        let m = Math.floor(s / 60); s -= m * 60;
        return `${h}h ${m}m ${s}s`;
    }

    function* range(a, b) {
        for (let i = a; i <= b; ++i) yield i;
    }

    // ---------------------------------------------------------------------------------
    //  Commands
    // ---------------------------------------------------------------------------------
    mod.command.add('fish', (key, arg, arg2, arg3, arg4) => {
        switch (key) {
            case 'blacklist':
                switch (arg) {
                    case 'add': {
                        let tmp = getItemIdChatLink(arg2);
                        if (tmp != null) {
                            if (config.blacklist.indexOf(tmp) == -1) {
                                config.blacklist.push(tmp);
                                mod.command.message(`Added item to blacklist: ${tmp}`);
                            } else mod.command.message('Already in blacklist.');
                        } else mod.command.message('Incorrect item link.');
                        break;
                    }
                    case 'remove': {
                        let tmp = getItemIdChatLink(arg2);
                        if (tmp != null) {
                            let idx = config.blacklist.indexOf(tmp);
                            if (idx == -1) mod.command.message('Not in blacklist.');
                            else { config.blacklist.splice(idx, 1); mod.command.message(`Removed from blacklist: ${tmp}`); }
                        } else mod.command.message('Incorrect item link.');
                        break;
                    }
                    case 'reset':
                        config.blacklist = [];
                        mod.command.message('Blacklist reset.');
                        break;
                }
                break;
            case 'filetmode':
                switch (arg) {
                    case 'bank': {
                        let amount = parseInt(arg2);
                        config.bankAmount = (amount > 500 && amount < 10000) ? amount : 8000;
                        config.filetmode = 'bank';
                        mod.command.message(`Set to bank ${config.bankAmount} filets after filling inventory.`);
                        if (Object.values(extendedFunctions.banker).some(x => !x)) {
                            config.filetmode = false;
                            mod.command.message('C_PUT_WARE_ITEM not mapped, banker functions disabled.');
                        }
                        break;
                    }
                    default:
                        config.filetmode = false;
                        mod.command.message('filetmode disabled.');
                        break;
                }
                break;
            case 'setrecipe':
                if (lastRecipe != null) { config.recipe = lastRecipe; mod.command.message(`Recipe id set to: ${lastRecipe}`); }
                else mod.command.message('Manually craft bait once (with the mod enabled) first.');
                break;
            case 'sellscroll':
                config.filetmode = 'sellscroll';
                mod.command.message('Set to sell fishes (scroll) after filling inventory.');
                if (Object.values(extendedFunctions.seller).some(x => !x)) {
                    config.filetmode = false;
                    mod.command.message('Seller packets not mapped, sellscroll functions disabled.');
                }
                break;
            case 'selltonpc': {
                config.filetmode = 'selltonpc';
                mod.command.message('Sell to NPC enabled.');
                let dist = parseInt(arg);
                if (dist > 0) { config.contdist = (dist > 8) ? 6 : dist; mod.command.message(`NPC contact range: ${config.contdist}m`); }
                let npc = findClosestNpc();
                if (npc === undefined || npc.distance === undefined || npc.distance > config.contdist * 25)
                    mod.command.message('Warning: no seller NPC within range.');
                break;
            }
            case 'autosalad':
                config.autosalad = !config.autosalad;
                mod.command.message('Auto fish salad ' + (config.autosalad ? 'enabled' : 'disabled') + '.');
                break;
            case 'gmmode':
                config.gmmode = arg;
                mod.command.message(`GM-detected mode set to ${config.gmmode}.`);
                break;
            case 'skipbaf':
                config.skipbaf = !config.skipbaf;
                mod.command.message('Skip BAF ' + (config.skipbaf ? 'enabled' : 'disabled') + '.');
                break;
            case 'humanize':
                config.humanize = !config.humanize;
                mod.command.message('Humanized delays ' + (config.humanize ? 'enabled' : 'disabled') + '.');
                break;
            case 'speed':
                if (['slow', 'normal', 'fast'].includes(arg)) {
                    config.speed = arg;
                    setSpeed(arg);
                    mod.command.message(`Speed preset: ${arg} (reel leans ${arg === 'fast' ? 'fast end' : arg === 'slow' ? 'slow end' : 'center'}). /8 fish save to keep it.`);
                } else {
                    mod.command.message('Usage: /8 fish speed slow|normal|fast');
                }
                break;
            case 'settings':
                if (config) printSettings(); else mod.command.message('Not in game yet.');
                break;
            case 'about':
            case 'credits':
                mod.command.message(`Auto-Fishing v${mod.info.version}`);
                mod.command.message('Developer/Maintainer: czentovic-tr - https://github.com/czentovic-tr');
                mod.command.message('Original mod by SoliaRdi.');
                break;
            case 'dismantle':
                dismantleCmd(arg, arg2, arg3);
                break;
            case 'notify':
                config.notify = !config.notify;
                mod.command.message('In-game notifications ' + (config.notify ? 'enabled' : 'disabled') + '.');
                break;
            case 'logfile':
                config.logfile = !config.logfile;
                mod.command.message('Log file ' + (config.logfile ? 'enabled' : 'disabled') + '.');
                break;
            case 'breaks':
                if (arg === 'on' || arg === 'off') {
                    config.breaks.enabled = (arg === 'on');
                    mod.command.message('Break scheduling ' + (config.breaks.enabled ? 'enabled' : 'disabled') + '.');
                    if (enabled) scheduleBreak();
                } else if (arg === 'set') {
                    let a = parseInt(arg2), b = parseInt(arg3), c2 = parseInt(arg4);
                    if (a > 0 && b >= a) { config.breaks.fishMin = a; config.breaks.fishMax = b; }
                    // arg4 form: /8 fish breaks set <fishMin> <fishMax> <idleMin> ... keep simple: idle via separate cmd
                    if (c2 > 0) config.breaks.idleMin = c2;
                    mod.command.message(`Breaks: fish ${config.breaks.fishMin}-${config.breaks.fishMax}m, idle ${config.breaks.idleMin}-${config.breaks.idleMax}m.`);
                } else {
                    mod.command.message(`Breaks ${config.breaks.enabled ? 'ON' : 'OFF'}: fish ${config.breaks.fishMin}-${config.breaks.fishMax}m, idle ${config.breaks.idleMin}-${config.breaks.idleMax}m. Use: breaks on|off | breaks set <fishMin> <fishMax> <idleMin>`);
                }
                break;
            case 'autostop':
                if (arg === 'daily') {
                    config.autostop.dailyTime = (arg2 && /^\d{1,2}:\d{2}$/.test(arg2)) ? arg2 : '';
                    mod.command.message(config.autostop.dailyTime ? `Daily auto-stop at ${config.autostop.dailyTime}.` : 'Daily auto-stop cleared.');
                    if (enabled) scheduleAutostop();
                } else {
                    let mins = parseInt(arg);
                    config.autostop.afterMinutes = (mins > 0) ? mins : 0;
                    mod.command.message(config.autostop.afterMinutes ? `Auto-stop after ${config.autostop.afterMinutes} min.` : 'Time-limit auto-stop disabled.');
                    if (enabled) scheduleAutostop();
                }
                break;
            case 'save':
                mod.saveSettings();
                mod.command.message('Configuration saved.');
                break;
            case 'reloadconf':
                mod.loadSettings();
                if (!mod.settings.profiles) mod.settings.profiles = {};
                if (!mod.settings.profiles[activeKey]) mod.settings.profiles[activeKey] = {};
                config = mod.settings.profiles[activeKey];
                applyDefaults(config);
                ensureDismantleTable(config);
                rebuildDismantleSet();
                mod.command.message('Configuration reloaded.');
                break;
            case 'debug':
                DEBUG = !DEBUG;
                mod.command.message('Debug mode ' + (DEBUG ? 'enabled' : 'disabled') + '.');
                break;
            case 'sniff':
                if (!DEBUG) { DEBUG = true; mod.command.message('(debug auto-enabled for sniffing)'); }
                sniffFishing = true;
                mod.clearTimeout(sniffTimer);
                sniffTimer = mod.setTimeout(() => { sniffFishing = false; mod.command.message('Sniffing stopped.'); }, 120000);
                mod.command.message('Sniffing outgoing packets for 2 min - do ONE full MANUAL fishing cycle now (cast, wait for bite, press F to reel, catch).');
                break;
            case 'info':
                mod.command.message(`Patch ${mod.majorPatchVersion}.${mod.minorPatchVersion} | fishing packets: ${fishingMapped ? 'OK' : 'MISSING'}`);
                mod.command.message(`banker: ${Object.values(extendedFunctions.banker).every(Boolean) ? 'ok' : 'no'} | seller: ${Object.values(extendedFunctions.seller).every(Boolean) ? 'ok' : 'no'} | dismantle type: ${dismantle_contract_type}`);
                if (!fishingMapped) checkFishingPackets();
                break;
            case 'stats': {
                let now = Date.now();
                let up = stats.sessionStart ? (now - stats.sessionStart) : 0;
                let hrs = up / 3600000;
                mod.command.message('=== Auto-Fishing stats ===');
                mod.command.message(`Uptime: ${fmtDur(up)}`);
                mod.command.message(`Total fish: ${stats.fish}${hrs > 0 ? ` (${(stats.fish / hrs).toFixed(0)}/h)` : ''}`);
                for (let lv in stats.byLevel)
                    mod.command.message(`  level ${lv}: ${stats.byLevel[lv]}`);
                mod.command.message(`Baits crafted: ${stats.baitsCrafted} | Filets banked: ${stats.filetsBanked} | Fish sold: ${stats.fishSold}`);
                mod.command.message(`Est. fish value: ${stats.goldEst}`);
                let tpf = statistic.length ? (statistic.reduce((p, n) => p + n.time, 0) / statistic.length / 1000) : 0;
                mod.command.message(`Time per fish: ${tpf.toFixed(2)}s`);
                break;
            }
            case 'help':
                mod.command.message('Auto-Fishing by czentovic-tr (https://github.com/czentovic-tr) | /8 fish about');
                mod.command.message('Commands: fish | settings | speed slow|normal|fast | info | stats | debug');
                mod.command.message('  skipbaf | autosalad | humanize | notify | logfile');
                mod.command.message('  dismantle on|off | now | tier <0-10> on|off | baf on|off | allon|alloff | status | <ctrl+click fish>');
                mod.command.message('  filetmode bank <n> | setrecipe (craft bait from filets)');
                mod.command.message('  breaks on|off | breaks set <fishMin> <fishMax> <idleMin> | autostop <min> | autostop daily <HH:MM>');
                mod.command.message('  gmmode exit|lobby|stop|nothing | save | reloadconf');
                mod.command.message('  Troubleshooting: /8 fish debug logs packets to mods/auto-fishing/auto-fishing-debug.log');
                break;
            default:
                if (key !== undefined) {
                    mod.command.message('Unknown command. Try /8 fish help');
                } else {
                    if (!config) { mod.command.message('Not in game yet.'); break; }
                    if (config.filetmode == 'selltonpc') {
                        let npc = findClosestNpc();
                        if (npc === undefined || npc.distance === undefined || npc.distance > config.contdist * 25)
                            mod.command.message('Warning: no seller NPC within range.');
                    }
                    toggleHooks();
                }
                break;
        }
    });
};
