/**
 * Main logic for the Hosterino -popup
 *
 * @constructor
 */
var HosterinoPopup = function () {
    this.settings = {
        username: "",
        status: "Loading...",
    };

    this.tie = undefined;
    this.form = undefined;
};

HosterinoPopup.prototype = {
    /**
     * Start the logic
     */
    start: function () {
        this.tie = new Tie(this.settings, document);
        this.form = document.querySelector("form");
        this.username = document.querySelector("input[name='username']");

        this.status("Ready.");

        this.loadSettings();
        this.setupListeners();
    },

    /**
     * Set up some event listeners we need
     */
    setupListeners: function () {
        this.form.addEventListener("submit", this.saveForm.bind(this));
        this.username.addEventListener("blur", this.saveForm.bind(this));

        chrome.extension.onMessage.addListener(this.onMessage.bind(this));
    },

    /**
     * Handler for received messages from the extension
     *
     * @param message
     * @param sender
     * @param sendResponse
     */
    onMessage: function (message, sender, sendResponse) {
        console.log("Received " + message.type + " message");
        console.dir(message);

        switch (message.type) {
            case "settingsError":
                if (message.field === "username") {
                    this.status("Invalid username " + this.settings.username);
                    this.settings.username = "";
                }
                break;

            case "settingsOk":
                this.status("Settings ok.");
                break;

            case "hostStatus":
                if (message.hosting) {
                    this.status("Now hosting " + message.hostTarget);
                } else {
                    this.status("Not hosting.");
                }
        }
    },

    /**
     * Triggered when the form is to be saved
     *
     * @param event
     * @returns {boolean}
     */
    saveForm: function (event) {
        event.preventDefault();

        this.saveSettings();
        this.status("Set username as " + this.settings.username);

        return false;
    },

    /**
     * Check if the settings in our memory seem ok
     *
     * @returns {boolean}
     */
    settingsOk: function () {
        this.settings.username = this.settings.username.replace(/\s/g, "");
        if (this.settings.username.length === 0) {
            this.status("Username is missing.");
            return false;
        }

        return true;
    },

    /**
     * Update the status message
     *
     * @param msg
     */
    status: function (msg) {
        console.log(msg);
        this.settings.status = msg;
    },

    /**
     * Load settings from extension
     */
    loadSettings: function () {
        chrome.extension.sendMessage({type: "loadSettings"}, function (response) {
            for (var key in response) {
                this.settings[key] = response[key];
            }
            this.status("Settings loaded.");
        }.bind(this));
    },

    /**
     * Save settings to extension
     */
    saveSettings: function () {
        this.settingsOk();
        chrome.extension.sendMessage({
            type: "saveSettings",
            settings: {
                username: this.settings.username
            }
        });
        this.status("Settings saved.");
    }
};

var popup = new HosterinoPopup();
popup.start();
