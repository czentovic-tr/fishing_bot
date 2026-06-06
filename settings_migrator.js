'use strict';

// Settings migrator for auto-fishing.
// Maintained by czentovic-tr (https://github.com/czentovic-tr); original mod by SoliaRdi.
// Called by the toolbox as migrator(from_ver, to_ver, settings).
// - On a fresh install from_ver is null/undefined and `settings` is missing.
// - On a version bump, migrate the old `settings` object up to to_ver.
//
// Per-character configuration lives under settings.profiles["<name>-<serverId>"].
// The active profile is selected at runtime on enter_game (see index.js).
module.exports = function MigrateSettings(from_ver, to_ver, settings) {
    if (from_ver === undefined || from_ver === null) {
        // Fresh install: start with an empty profile map.
        return { profiles: {} };
    }

    // Future migrations go here, e.g.:
    // if (from_ver < 2) { /* transform settings */ }

    if (!settings || typeof settings !== 'object')
        settings = {};
    if (!settings.profiles)
        settings.profiles = {};

    return settings;
};
