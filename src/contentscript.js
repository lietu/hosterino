(function () {
    /**
     * The content script for Hosterino.
     *
     * Run when you're on Twitch.tv -pages.
     *
     * @constructor
     */
    var HosterinoContent = function () {
        this.settings = {
            hosting: undefined,
            hostTarget: undefined
        };

        this.root = undefined;
        this.text = undefined;
        this.dismiss = undefined;
    };

    HosterinoContent.prototype = {
        /**
         * Start the Hosterino content script
         */
        start: function () {
            this.setupElements();
            this.startListeners();

            this.status("Ready.");

            chrome.extension.sendMessage({
                type: "requestHostStatus"
            });
        },

        /**
         * Create the elements for the Hosterino notification
         */
        setupElements: function () {
            this.status("Setting up elements");
            this.root = document.createElement("DIV");
            this.root.classList.add("hosterino");

            this.text = document.createElement("SPAN");
            this.setText("Loading...");

            this.dismiss = document.createElement("DIV");
            this.dismiss.textContent = "✕";
            this.dismiss.classList.add("dismiss");

            this.root.appendChild(this.text);
            this.root.appendChild(this.dismiss);
            document.body.appendChild(this.root);

            this.status("Created elements");
            console.log(this.root);
        },

        /**
         * Show a notification text
         *
         * @param text
         */
        setText: function(text) {
            this.text.textContent = text;
            this.status(text);
            this.root.classList.remove("shoo");
        },

        /**
         * Start listening to all relevant events
         */
        startListeners: function () {
            chrome.extension.onMessage.addListener(
                this.onMessage.bind(this)
            );

            this.dismiss.addEventListener("click", this.onDismiss.bind(this));
        },

        /**
         * Click on the "X" / dismiss button
         */
        onDismiss: function() {
            this.root.classList.add("shoo");
        },

        /**
         * Received a message from extension
         * @param message
         * @param sender
         * @param sendResponse
         */
        onMessage: function (message, sender, sendResponse) {
            switch (message.type) {
                case "hostStatus":
                    if (message.hosting) {
                        this.status("Now hosting " + message.hostTarget);
                        this.online(message.hostTarget);
                    } else {
                        this.status("Not hosting.");
                        this.offline();
                    }

            }
        },

        /**
         * Now hosting someone
         *
         * @param username
         */
        online: function (username) {
            if (this.hosting && this.hostTarget === username) {
                return;
            }

            this.hosting = true;
            this.hostTarget = username;
            this.setText("Hosting " + username);
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
            this.setText("Not hosting anyone. Maybe you should fix that.");
        },

        /**
         * Log current status
         * @param msg
         */
        status: function (msg) {
            console.log("HOSTERINO: " + msg);
        }
    };

    var content = new HosterinoContent();
    content.start();

    window.HosterinoContent = content;
})();
