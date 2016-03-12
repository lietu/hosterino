/**
 * Hosterino background script, polls the status of hosts, communicates with
 * popup and content scripts.
 *
 * @constructor
 */
var Hosterino = function () {
    this.settings = {
        username: undefined,
        userId: undefined,
        hosting: false,
        hostTarget: undefined,
    };

    this.intervalTimeout = 60000;
    this.checkInterval = undefined;
};

Hosterino.prototype = {
    /**
     * Start the background script
     */
    start: function () {
        this.loadSettings();
        this.startListeners();

        this.status("Ready.");

        this.reactivate();
    },

    /**
     * Start listening for events
     */
    startListeners: function () {
        chrome.extension.onMessage.addListener(
            this.onMessage.bind(this)
        );
    },

    /**
     * Message received from extension components
     *
     * @param message
     * @param sender
     * @param sendResponse
     */
    onMessage: function (message, sender, sendResponse) {
        this.status("Got message " + message.type);
        switch (message.type) {
            case "loadSettings":
                var settings = {
                    "username": this.settings.username
                };

                console.dir(settings);

                sendResponse(settings);
                break;

            case "requestHostStatus":
                this.sendHostStatus();
                break;

            case "saveSettings":
                this.status("Got new settings");
                for (var key in message.settings) {
                    if (key === "username") {
                        continue;

                    }
                    this.settings[key] = message.settings[key];
                    this.status(key + ": " + this.settings[key]);
                }

                if (message.settings.username !== this.settings.username || this.settings.userId === undefined) {
                    this.setUsername(message.settings.username);
                } else {
                    this.saveSettings();
                }

                break;
        }
    },

    /**
     * Try and set the active username
     *
     * @param username
     */
    setUsername: function (username) {
        username = String(username).replace(/\s/g, "").toLowerCase();
        if (username.length === 0) {
            this.settingsError("username");
            return;
        }

        var url = "http://api.twitch.tv/api/channels/" + username;
        this.getUrl(url, function (req) {
            if (req.status !== 200) {
                this.settingsError("username");
                return;
            }

            var data = JSON.parse(req.responseText);
            console.dir(data);
            if (data._id) {
                this.settings.userId = data._id;
                this.settings.username = username;
                this.saveSettings();
                this.reactivate();
            } else {
                this.settingsError("username");
            }
        }.bind(this));
    },

    /**
     * Notify all components of an error with the settings
     *
     * @param field
     */
    settingsError: function (field) {
        this.settings[field] = undefined;

        chrome.extension.sendMessage({
            type: "settingsError",
            field: field
        });
    },

    /**
     * Hosting someone
     *
     * @param username
     */
    online: function (username) {
        if (this.hosting && this.hostTarget === username) {
            return;
        }

        this.hosting = true;
        this.hostTarget = username;
        this.status("Hosting " + username);
        this.updateIcon();

        chrome.browserAction.setTitle({
            "title": "Hosterino: Hosting " + username
        });

        this.sendHostStatus();
    },

    /**
     * Not hosting anyone
     */
    offline: function () {
        if (this.hosting === false) {
            return;
        }

        this.hosting = false;
        this.hostTarget = undefined;
        this.updateIcon();

        chrome.browserAction.setTitle({
            "title": "Hosterino: Not hosting"
        });

        this.sendHostStatus();
    },

    /**
     * Send the current hosting status to all components
     */
    sendHostStatus: function () {
        var status = {
            "type": "hostStatus",
            "hosting": this.hosting,
            "hostTarget": this.hostTarget
        };

        chrome.tabs.query({
            url: [
                "http://twitch.tv/*",
                "http://www.twitch.tv/*",
                "https://twitch.tv/*",
                "https://www.twitch.tv/*"
            ]
        }, function (tabs) {
            tabs.forEach(function (tab, index) {
                chrome.tabs.sendMessage(tab.id, status);
            });
        });
    },

    /**
     * Update the extension icon appropriately
     */
    updateIcon: function () {
        if (this.hosting) {
            chrome.browserAction.setIcon({
                "path": "icon.png"
            });
        } else {
            chrome.browserAction.setIcon({
                "path": "icon_off.png"
            });
        }
    },

    /**
     * XMLHttpRequest wrapper
     *
     * @param url
     * @param callback
     */
    getUrl: function (url, callback) {
        var STATES = {
            0: "UNSENT",
            1: "OPENED",
            2: "HEADERS_RECEIVED",
            3: "LOADING",
            4: "DONE"
        };

        var req = new XMLHttpRequest();
        req.onload = function () {
            console.log(url + " loaded");
            callback(req);
        };
        req.onreadystatechange = function () {
            var state = STATES[req.readyState];
            console.log(url + ": " + state);
        };

        req.open('GET', url, true);
        req.send();
    },

    /**
     * Setup all monitoring for hosting
     */
    reactivate: function () {
        if (!this.settingsOk()) {
            return;
        }

        this.updateIcon();

        this.stopChecks();
        this.startChecks();
    },

    /**
     * Stop existing checks for hosting
     */
    stopChecks: function () {
        if (this.checkInterval !== undefined) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }
    },

    /**
     * Start checking for hosting periodically
     */
    startChecks: function () {
        this.checkInterval = setInterval(this.check.bind(this), this.intervalTimeout);

        this.check();
    },

    /**
     * Check the current status of hosting
     */
    check: function () {
        if (!this.settings.userId) {
            return;
        }

        var url = "http://tmi.twitch.tv/hosts?include_logins=1&host=" + this.settings.userId;
        this.getUrl(url, function (req) {
            if (req.status !== 200) {
                return;
            }

            var data = JSON.parse(req.responseText);

            this.status("Got host status update");
            console.dir(data);

            try {
                var entry = data.hosts[0];
            } catch (e) {
                this.status("Invalid response structure");
                return;
            }

            if (String(entry.host_id) !== String(this.settings.userId)) {
                this.status("Invalid response");
                return;
            }

            if (entry.target_login) {
                this.online(entry.target_login);
            } else {
                this.offline();
            }

        }.bind(this));
    },

    /**
     * Check if the current settings are ok and we're able to check for hosting
     *
     * @returns {boolean}
     */
    settingsOk: function () {
        if (this.settings.username === undefined) {
            this.status("Username is missing.");
            return false;
        }

        this.settings.username = this.settings.username.replace(/\s/g, "");
        if (this.settings.username.length === 0) {
            this.status("Username is missing.");
            return false;
        }

        return true;
    },

    /**
     * Log current status
     *
     * @param msg
     */
    status: function (msg) {
        console.log(msg);
    },

    /**
     * Load the saved settings
     */
    loadSettings: function () {
        this.settings.username = localStorage.getItem("username");
        this.settings.userId = localStorage.getItem("userId");

        this.status("Settings loaded.");
        this.status("Username: " + this.settings.username);
        this.status("User ID: " + this.settings.userId);
    },

    /**
     * Save current settings
     */
    saveSettings: function () {
        this.settingsOk();

        localStorage.setItem("username", this.settings.username);
        localStorage.setItem("userId", this.settings.userId);

        this.status("Settings saved.");

        chrome.extension.sendMessage({type: "settingsOk"})
    }

};

var hosterino = new Hosterino();
hosterino.start();
