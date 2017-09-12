"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BINDING_REGEXP = /^\{Binding (_|[a-zA-Z])+(\w*)\}$/;

var BindingData = exports.BindingData = function () {
    function BindingData(data) {
        _classCallCheck(this, BindingData);

        this.data = data;
        this._observers = [];
    }

    _createClass(BindingData, [{
        key: "notify",
        value: function notify(dataName, dataValue) {
            this._observers.forEach(function (element) {
                element.update(dataName, dataValue);
            });
        }
    }, {
        key: "addListener",
        value: function addListener(listener) {
            if (this._observers.find(function (element) {
                return element.id === listener.id;
            }) === undefined) {
                this._observers.push(listener);
            }
        }
    }, {
        key: "removeListener",
        value: function removeListener(listener) {
            var id = void 0;
            if (typeof listener === "string") {
                id = listener;
            } else {
                id = listener.id;
            }
            var index = this._observers.findIndex(function (element) {
                return element.id === id;
            });
            if (index !== -1) {
                this._observers.splice(index, 1);
            }
        }
    }, {
        key: "clear",
        value: function clear() {
            this._observers = [];
        }
    }]);

    return BindingData;
}();

var DOMWatcher = function () {
    function DOMWatcher(node, binding, bindingAttrs, bindingContents, mutationObserver) {
        _classCallCheck(this, DOMWatcher);

        this.node = node;
        this.binding = binding;
        this.bindingAttrs = bindingAttrs;
        this.bindingContents = bindingContents;
        this.mutationObserver = mutationObserver;
    }

    _createClass(DOMWatcher, [{
        key: "update",
        value: function update(dataName, dataValue) {
            if (this.node.nodeType === 1) {
                var index = this.bindingContents.findIndex(function (element) {
                    return element === dataName;
                });
                if (index === -1) {
                    return;
                }
                var attrName = this.bindingAttrs[index];
                var attrs = this.node.attributes;
                var attr = attrs.getNamedItem(attrName);
                if (attr === null) {
                    throw "Can't find attribute named " + attrName + "";
                }
                if (attr.nodeValue !== dataValue) {
                    attr.nodeValue = dataValue;
                    if ((this.node.nodeName === "INPUT" || this.node.nodeName === "TEXTAREA") && attrName === "value") {
                        this.node.value = dataValue;
                    }
                }
                return;
            }
            if (this.node.nodeType === 3) {
                var _index = this.bindingContents.findIndex(function (element) {
                    return element === dataName;
                });
                if (_index === -1) {
                    return;
                }
                this.node.nodeValue = dataValue;
            }
        }
    }]);

    return DOMWatcher;
}();

var Binding = exports.Binding = function () {
    function Binding(id, bindingData) {
        _classCallCheck(this, Binding);

        this.id = id;
        this.data = bindingData;
        this._observers = [];
        this.compileChildNodes = true;
        this.compileAllChildNodes = false;
        this.data.addListener(this);
        observe(this);
    }

    _createClass(Binding, [{
        key: "update",
        value: function update(dataName, dataValue) {
            this.notify(dataName, dataValue);
        }
    }, {
        key: "addListener",
        value: function addListener(listener) {
            if (this._observers.find(function (element) {
                return element.node === listener.node;
            }) === undefined) {
                this._observers.push(listener);
            }
        }
    }, {
        key: "removeListener",
        value: function removeListener(listener) {
            var node = void 0;
            if (listener instanceof DOMWatcher) {
                node = listener.node;
            } else {
                node = listener;
            }
            var index = this._observers.findIndex(function (element) {
                return element.node === node;
            });
            if (index !== -1) {
                this._observers[index].mutationObserver.disconnect();
                this._observers.splice(index, 1);
            }
        }
    }, {
        key: "notify",
        value: function notify(dataName, dataValue) {
            this._observers.forEach(function (element) {
                element.update(dataName, dataValue);
            });
        }
    }, {
        key: "compile",
        value: function compile() {
            var node = document.getElementById(this.id);
            if (node === null) {
                throw "Can't find node by ID: " + this.id;
            }
            _compile(node, this, this.compileChildNodes, this.compileAllChildNodes);
        }
    }, {
        key: "clear",
        value: function clear() {
            this._observers.forEach(function (element) {
                element.mutationObserver.disconnect();
            });
            this._observers = [];
            this.data.removeListener(this);
        }
    }]);

    return Binding;
}();

function defineReactive(binding, key) {
    var data = binding.data.data;
    Object.defineProperty(binding, key, {
        get: function get() {
            return data[key];
        },
        set: function set(newValue) {
            if (newValue === binding.data[key]) {
                return;
            }
            data[key] = newValue;
            binding.data.notify(key, newValue);
        }
    });
}
function observe(binding) {
    Object.keys(binding.data.data).forEach(function (key) {
        defineReactive(binding, key);
    });
}
function compileTextNode(node, binding) {
    var nodevalue = node.data.trim();
    if (nodevalue.match(BINDING_REGEXP) !== null) {
        var bindingContent = nodevalue.substring(9, nodevalue.length - 1);
        if (binding[bindingContent] !== undefined) {
            node.nodeValue = binding[bindingContent];
            var mo = new MutationObserver(function (records) {
                records.forEach(function (record) {
                    var newValue = record.target.nodeValue;
                    if (record.oldValue !== newValue) {
                        binding[bindingContent] = newValue;
                    }
                });
            });
            mo.observe(node, {
                "characterData": true,
                "characterDataOldValue": true
            });
            var watcher = new DOMWatcher(node, binding, ["nodeValue"], [bindingContent], mo);
            binding.addListener(watcher);
        }
    }
    return;
}
function compileHTMLNode(node, binding, compileChildNodes, compileAllChildNodes) {
    var bindingAttrs = [];
    var bindingContents = [];
    if (node.hasAttributes()) {
        var attrs = node.attributes;
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            var attrValue = attrs[i].nodeValue;
            if (attr.nodeValue.trim().match(BINDING_REGEXP) !== null) {
                var bindingContent = attr.nodeValue.substring(9, attr.nodeValue.length - 1);
                if (binding[bindingContent] !== undefined) {
                    bindingAttrs.push(attr.nodeName);
                    bindingContents.push(bindingContent);
                    if (attr.nodeName === "value" && (node.nodeName === "INPUT" || node.nodeName === "TEXTAREA")) {
                        node.addEventListener("input", function (e) {
                            var element = e.target;
                            var value = element.value;
                            element.setAttribute("value", value);
                            element.value = value;
                        }, false);
                    }
                    attr.nodeValue = binding[bindingContent];
                }
            }
        }
    }
    if ((compileChildNodes || compileAllChildNodes) && node.hasChildNodes()) {
        var compileGrandsonNodes = void 0;
        if (compileAllChildNodes) {
            compileGrandsonNodes = true;
        } else {
            compileGrandsonNodes = false;
        }
        var frag = document.createDocumentFragment();
        var child = node.firstChild;
        while (child !== null) {
            _compile(child, binding, compileGrandsonNodes, compileAllChildNodes);
            frag.appendChild(child);
            child = node.firstChild;
        }
        node.appendChild(frag);
    }
    if (bindingAttrs.length !== 0 || (compileChildNodes || compileAllChildNodes) && node.hasChildNodes()) {
        var mo = new MutationObserver(function (records) {
            records.forEach(function (record) {
                if (record.type === "attributes") {
                    var newValue = record.target.attributes.getNamedItem(record.attributeName).nodeValue;
                    if (record.oldValue !== newValue) {
                        var index = bindingAttrs.findIndex(function (value) {
                            return value === record.attributeName;
                        });
                        binding[bindingContents[index]] = newValue;
                    }
                    if ((record.target.nodeName === "INPUT" || record.target.nodeName === "TEXTAREA") && record.attributeName === "value") {
                        record.target.value = newValue;
                    }
                    return;
                }
                if (record.type === "childList") {
                    if (record.removedNodes !== null) {
                        record.removedNodes.forEach(function (element) {
                            binding.removeListener(element);
                        });
                    }
                    if (record.addedNodes !== null) {
                        record.addedNodes.forEach(function (element) {
                            _compile(element, binding, compileChildNodes, compileChildNodes);
                        });
                    }
                }
            });
        });
        var options = {};
        if (bindingAttrs.length !== 0) {
            options.attributes = true;
            options.attributeOldValue = true;
            options.attributeFilter = bindingAttrs;
        }
        if (compileChildNodes || compileAllChildNodes) {
            options.childList = true;
        }
        mo.observe(node, options);
        var watcher = new DOMWatcher(node, binding, bindingAttrs, bindingContents, mo);
        binding.addListener(watcher);
    }
    return;
}
function _compile(node, binding, compileChildNodes, compileAllChildNodes) {
    if (node.nodeType === 1) {
        compileHTMLNode(node, binding, compileChildNodes, compileAllChildNodes);
        return;
    }
    if (node.nodeType === 3) {
        compileTextNode(node, binding);
        return;
    }
}
