(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.Tie = factory();
    }
}(this, function () {

/**
 * Should we show debug messages? (for development purposes only)
 * @type {boolean}
 */
var DEBUG = false;
/**
 * Which HTML attribute are we using for binding rules
 * @type {string}
 */
var ATTRIBUTE = "data-tie";
/**
 * How to parse the single rules to their type + path -components
 * @type {RegExp}
 */
var PARSE_RULE = / *([^:]+ *): *([^ ]+) *$/;
/**
 * What event types can we listen to
 * @type {string[]}
 */
var CHANGE_EVENTS = ["change", "keyup"];
/**
 * What events are considered "clicks"?
 */
var CLICK_EVENTS = ["click"];
/**
 * Tie data objects to DOM elements.
 */
var Tie = (function () {
    /**
     * Create a new Tie
     * @param data Data to bind. OBJECT WILL BE MODIFIED!
     * @param element The root element
     */
    function Tie(data, element) {
        var _this = this;
        _this._onEvent = _this.onEvent.bind(this);
        this.bindings = {};
        this.listeners = {};
        CHANGE_EVENTS.forEach(function (type) {
            _this.listeners[type] = [];
        });
        CLICK_EVENTS.forEach(function (type) {
            _this.listeners[type] = [];
        });
        this._setData(data);
        this._setRootElement(element);
        this.refresh();
    }
    /**
     * Set the data to bind. OBJECT WILL BE MODIFIED!
     * @param data
     */
    Tie.prototype.setData = function (data) {
        this._setData(data);
        this.refresh();
    };
    /**
     * Set the root element to base bindings to.
     * @param element
     */
    Tie.prototype.setRootElement = function (element) {
        this.clearListeners();
        this._setRootElement(element);
        this.refresh();
    };
    /**
     * Refresh all bindings, e.g. after re-rendering HTML.
     */
    Tie.prototype.rebind = function () {
        this.clearListeners();
        this.bind();
        this.refresh();
    };
    /**
     * Remove all event listeners from the DOM
     */
    Tie.prototype.clearListeners = function () {
        var listeners = this.listeners;
        var _this = this;
        var count = 0;
        var eventType;
        for (eventType in listeners) {
            if (!listeners.hasOwnProperty(eventType)) {
                continue;
            }
            listeners[eventType].forEach(function (element) {
                count += 1;
                element.removeEventListener(eventType, _this._onEvent);
            });
        }
        if (DEBUG) {
            console.log("Cleared " + count + " listeners");
        }
    };
    /**
     * Update the values to all DOM bindings
     */
    Tie.prototype.refresh = function () {
        if (DEBUG) {
            console.log("Refreshing all bindings");
        }
        for (var path in this.bindings) {
            if (!this.bindings.hasOwnProperty(path)) {
                continue;
            }
            this.updatePath(path);
        }
    };
    /**
     * Actually set the data to bid, without refreshing.
     * @param data
     * @private
     */
    Tie.prototype._setData = function (data) {
        if (DEBUG) {
            console.log("Setting data", data);
        }
        this.data = data;
        this.wrap(data, "");
    };
    /**
     * Actually set the root element, without refreshing.
     * @param element
     * @private
     */
    Tie.prototype._setRootElement = function (element) {
        if (element === this.rootElement) {
            return;
        }
        if (DEBUG) {
            console.log("Setting root element", element);
        }
        this.rootElement = element;
        this.rebind();
    };
    /**
     * "Wrap" an object so we get updates of
     * @param object
     */
    Tie.prototype.wrap = function (object, rootPath) {
        rootPath = rootPath ? rootPath : "";
        // TODO: Support Object.observe & Proxy
        if (DEBUG) {
            console.log("Wrapping '" + rootPath + "'", object);
        }
        for (var key in object) {
            if (!object.hasOwnProperty(key)) {
                continue;
            }
            var value = object[key];
            var path = (rootPath === "" ? key : rootPath + "." + key);
            this.property(object, key, value, path);
            if (typeof value === "object") {
                this.wrap(value, path);
            }
        }
    };
    /**
     * Convert an object property into a property we can watch.
     * @param object
     * @param key
     * @param value
     */
    Tie.prototype.property = function (object, key, value, path) {
        var _this = this;
        Object.defineProperty(object, key, {
            get: function () {
                return value;
            },
            set: function (newValue) {
                if (newValue !== value) {
                    value = newValue;
                    _this.updatePath(path);
                }
            },
        });
    };
    /**
     * Get notified of a DOM change. DO NOT USE DIRECTLY, USE _onEvent, WHICH
     * IS BOUND TO "this".
     * @param event
     */
    Tie.prototype.onEvent = function (event) {
        var element = event.target;
        var type = event.type;
        var path = element.getAttribute(ATTRIBUTE + "-on-" + type);
        if (DEBUG) {
            console.log("Got '" + type + "' event for '" + path + "'");
        }
        switch (type) {
            case "keyup":
            case "change":
                this.setValue(path, this.getValue(element));
                break;
            case "click":
                this.onClick(path, event);
        }
    };
    Tie.prototype.onClick = function (path, event) {
        if (DEBUG) {
            console.log("Relaying click to '" + path + "'");
        }
        var ret = this.findPath(path);
        ret.obj[ret.key](event);
    };
    /**
     * Set any value to the given path of the data object
     * @param path
     * @param value
     */
    Tie.prototype.setValue = function (path, value) {
        if (DEBUG) {
            console.log("Updating value of '" + path + "'", value);
        }
        var ret = this.findPath(path);
        // Take the last part and assign value
        ret.obj[ret.key] = value;
    };
    /**
     * Find the last part of the path + the remaining key, so assignments work
     * nicely.
     *
     * @param path
     * @returns {{obj: Object, key: string}}
     */
    Tie.prototype.findPath = function (path) {
        var parts = path.split(".");
        var obj = this.data;
        // Parse through the object tree through the path, leaving last level
        var i = 0, max = parts.length - 1;
        for (; i < max; i += 1) {
            obj = obj[parts[i]];
        }
        return {
            key: parts[max],
            obj: obj,
        };
    };
    /**
     * Get the value assigned to an element
     * @param element
     * @returns
     */
    Tie.prototype.getValue = function (element) {
        return element.value;
    };
    /**
     * Set up all DOM bindings
     */
    Tie.prototype.bind = function () {
        if (DEBUG) {
            console.log("Setting up DOM bindings");
        }
        var elements = Array.prototype.slice.call(this.rootElement.querySelectorAll("[" + ATTRIBUTE + "]"));
        elements.forEach(this.processElement.bind(this));
    };
    /**
     * Set up bindings for a single element
     * @param element
     */
    Tie.prototype.processElement = function (element) {
        var rules = element.getAttribute(ATTRIBUTE).split(",");
        var _this = this;
        rules.forEach(function (rule) {
            _this.parseRule(element, rule);
        });
    };
    /**
     * Parse a single rule in an element into bindings definitions
     * @param element
     * @param rule
     */
    Tie.prototype.parseRule = function (element, rule) {
        var parts = PARSE_RULE.exec(rule);
        var type = parts[1];
        var path = parts[2];
        if (!this.bindings[path]) {
            this.bindings[path] = {};
        }
        if (!this.bindings[path][type]) {
            this.bindings[path][type] = [];
        }
        if (DEBUG) {
            console.log("Bound '" + type + "' of '" + path + "'", element);
        }
        this.bindings[path][type].push(element);
    };
    /**
     * Update DOM values to a single property path's current value
     * @param path
     */
    Tie.prototype.updatePath = function (path) {
        if (DEBUG) {
            console.log("Updating elements bound to '" + path + "'");
        }
        var ret = this.findPath(path);
        var value = ret.obj[ret.key];
        var _this = this;
        var type;
        for (type in this.bindings[path]) {
            if (!this.bindings[path].hasOwnProperty(type)) {
                continue;
            }
            this.bindings[path][type].forEach(function (element) {
                _this.updateElementFromPath(element, path, type, value);
            });
        }
    };
    /**
     * Update a single element from the given path
     * @param element
     * @param path
     * @param type
     * @param value
     */
    Tie.prototype.updateElementFromPath = function (element, path, type, value) {
        switch (type) {
            case "text":
                element.innerText = element.textContent = value;
                break;
            case "html":
                element.innerHTML = value;
                break;
            case "value":
                element.value = value;
                this.listenToChanges(element, path);
                break;
            case "click":
                this.listenForClicks(element, path);
                break;
            default:
                throw new Error("Tried to set '" + path + "' to unsupported '" + type + "' of an element");
        }
    };
    /**
     * Listen to changes on an element
     * @param element
     * @param path
     */
    Tie.prototype.listenToChanges = function (element, path) {
        if (DEBUG) {
            console.log("Listening to events for '" + path + "'", element);
        }
        var _this = this;
        CHANGE_EVENTS.forEach(function (event) {
            element.addEventListener(event, _this._onEvent);
            _this.listeners[event].push(element);
            element.setAttribute(ATTRIBUTE + "-on-" + event, path);
        });
    };
    /**
     * Listen to clicks on an element
     * @param element
     * @param path
     */
    Tie.prototype.listenForClicks = function (element, path) {
        if (DEBUG) {
            console.log("Listening to clicks for '" + path + "'", element);
        }
        var _this = this;
        CLICK_EVENTS.forEach(function (event) {
            element.addEventListener(event, _this._onEvent);
            _this.listeners[event].push(element);
            element.setAttribute(ATTRIBUTE + "-on-" + event, path);
        });
    };
    return Tie;
})();
return Tie;
//# sourceMappingURL=tie.js.map
}));