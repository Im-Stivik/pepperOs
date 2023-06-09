// SPDX-FileCopyrightText: 2020-2022 Romain Vigier <contact AT romainvigier.fr>
// SPDX-License-Identifier: GPL-3.0-or-later

const { Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const { extensionManager } = imports.ui.main;

const Me = extensionUtils.getCurrentExtension();

const debug = Me.imports.debug;
const utils = Me.imports.utils;

const { Switcher } = Me.imports.modules.Switcher;

const { Time } = Me.imports.enums.Time;


/**
 * Function called to update the system theme when no settings exist.
 *
 * @callback noSettingsUpdateSystemThemeCallback
 * @param {Time} time New time.
 */


/**
 * The Theme Switcher sets the system theme according to the time, either via
 * provided settings or by running a callback function.
 *
 * It also listens to system theme changes to update the current variant setting.
 *
 * @param {Object} params Params object.
 * @param {string} params.name Name of the switcher.
 * @param {Timer} params.timer Timer to listen to.
 * @param {Gio.Settings} params.settings Settings with the `enabled`, `day` and `night` keys.
 * @param {Gio.Settings=} params.systemSettings System settings containing the theme name.
 * @param {string} params.themeKey Settings key of the theme name.
 * @param {noSettingsUpdateSystemThemeCallback} Callback function.
 */
var SwitcherTheme = class extends Switcher {
    #name;
    #timer;
    #settings;
    #systemSettings;
    #themeKey;
    #noSettingsUpdateSystemThemeCallback;

    #settingsConnections = [];

    constructor({ name, timer, settings, systemSettings = null, themeKey, noSettingsUpdateSystemThemeCallback = null }) {
        super({
            name,
            timer,
            settings,
            callback: time => this.#onTimeChanged(time),
        });
        this.#name = name;
        this.#timer = timer;
        this.#settings = settings;
        this.#systemSettings = systemSettings;
        this.#themeKey = themeKey;
        this.#noSettingsUpdateSystemThemeCallback = noSettingsUpdateSystemThemeCallback;
    }

    enable() {
        if (this.#settings.get_boolean('enabled'))
            this.#connectSettings();
        super.enable();
    }

    disable() {
        this.#disconnectSettings();
        super.disable();
    }

    set systemSettings(settings) {
        if (settings === this.#systemSettings)
            return;
        this.#systemSettings = settings;
        this.disable();
        this.enable();
    }

    #connectSettings() {
        debug.message(`Connecting ${this.#name} switcher to settings...`);
        this.#settingsConnections.push({
            settings: this.#settings,
            id: this.#settings.connect('changed::day', this.#onDayVariantChanged.bind(this)),
        });
        this.#settingsConnections.push({
            settings: this.#settings,
            id: this.#settings.connect('changed::night', this.#onNightVariantChanged.bind(this)),
        });
        if (!this.#systemSettings)
            return;
        this.#settingsConnections.push({
            settings: this.#systemSettings,
            id: this.#systemSettings.connect(`changed::${this.#themeKey}`, this.#onSystemThemeChanged.bind(this)),
        });
    }

    #disconnectSettings() {
        this.#settingsConnections.forEach(({ settings, id }) => settings.disconnect(id));
        this.#settingsConnections = [];
        debug.message(`Disconnected ${this.#name} switcher from settings.`);
    }


    #onDayVariantChanged() {
        debug.message(`Day ${this.#name} variant changed to '${this.#settings.get_string('day')}'.`);
        this.#updateSystemTheme();
    }

    #onNightVariantChanged() {
        debug.message(`Night ${this.#name} variant changed to '${this.#settings.get_string('night')}'.`);
        this.#updateSystemTheme();
    }

    #onSystemThemeChanged() {
        debug.message(`System ${this.#name} changed to '${this.#systemSettings.get_string(this.#themeKey)}'.`);
        this.#updateCurrentVariant();
    }

    #onTimeChanged(_time) {
        this.#updateSystemTheme();
    }


    #updateCurrentVariant() {
        if (this.#timer.time === Time.UNKNOWN || !this.#systemSettings)
            return;
        this.#settings.set_string(this.#timer.time, this.#systemSettings.get_string(this.#themeKey));
    }

    #updateSystemTheme() {
        if (this.#timer.time === Time.UNKNOWN)
            return;
        debug.message(`Setting the ${this.#timer.time} ${this.#name} variant...`);
        if (this.#systemSettings)
            this.#systemSettings.set_string(this.#themeKey, this.#settings.get_string(this.#timer.time));
        else if (this.#noSettingsUpdateSystemThemeCallback)
            this.#noSettingsUpdateSystemThemeCallback(this.#timer.time);
    }
};


var SwitcherThemeCursor = class extends SwitcherTheme {
    constructor({ timer }) {
        super({
            name: 'Cursor theme',
            timer,
            settings: extensionUtils.getSettings(`${Me.metadata['settings-schema']}.cursor-variants`),
            systemSettings: new Gio.Settings({ schema: 'org.gnome.desktop.interface' }),
            themeKey: 'cursor-theme',
        });
    }
};


var SwitcherThemeGtk = class extends SwitcherTheme {
    constructor({ timer }) {
        super({
            name: 'GTK theme',
            timer,
            settings: extensionUtils.getSettings(`${Me.metadata['settings-schema']}.gtk-variants`),
            systemSettings: new Gio.Settings({ schema: 'org.gnome.desktop.interface' }),
            themeKey: 'gtk-theme',
        });
    }
};


var SwitcherThemeIcon = class extends SwitcherTheme {
    constructor({ timer }) {
        super({
            name: 'Icon theme',
            timer,
            settings: extensionUtils.getSettings(`${Me.metadata['settings-schema']}.icon-variants`),
            systemSettings: new Gio.Settings({ schema: 'org.gnome.desktop.interface' }),
            themeKey: 'icon-theme',
        });
    }
};


var SwitcherThemeShell = class extends SwitcherTheme {
    #settings;
    #extensionManagerConnection = null;

    constructor({ timer }) {
        const settings = extensionUtils.getSettings(`${Me.metadata['settings-schema']}.shell-variants`);
        super({
            name: 'Shell theme',
            timer,
            settings,
            systemSettings: utils.getUserthemesSettings(),
            themeKey: 'name',
            noSettingsUpdateSystemThemeCallback: time => this.#noSettingsUpdateSystemThemeCallback(time),
        });
        this.#settings = settings;
    }

    enable() {
        super.enable();
        this.#extensionManagerConnection = extensionManager.connect('extension-state-changed', this.#onExtensionStateChanged.bind(this));
    }

    disable() {
        super.disable();
        if (this.#extensionManagerConnection) {
            extensionManager.disconnect(this.#extensionManagerConnection);
            this.#extensionManagerConnection = null;
        }
    }

    #noSettingsUpdateSystemThemeCallback(time) {
        const shellTheme = this.#settings.get_string(time);
        const stylesheet = utils.getShellThemeStylesheet(shellTheme);
        utils.applyShellStylesheet(stylesheet);
    }

    #onExtensionStateChanged() {
        this.systemSettings = utils.getUserthemesSettings();
    }
};
