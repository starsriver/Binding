const BINDING_REGEXP = /^\{Binding (_|[a-zA-Z])+(\w*)\}$/;
export class BindingData {
    constructor(data) {
        this.data = data;
        this._observers = [];
    }
    notify(dataName, dataValue) {
        this._observers.forEach(element => {
            element.update(dataName, dataValue);
        });
    }
    addListener(listener) {
        if (this._observers.find(element => {
            return element.id === listener.id;
        }) === undefined) {
            this._observers.push(listener);
        }
    }
    removeListener(listener) {
        let id;
        if (typeof listener === "string") {
            id = listener;
        }
        else {
            id = listener.id;
        }
        let index = this._observers.findIndex(element => {
            return element.id === id;
        });
        if (index !== -1) {
            this._observers.splice(index, 1);
        }
    }
    clear() {
        this._observers = [];
    }
}
class DOMWatcher {
    constructor(node, binding, bindingAttrs, bindingContents, mutationObserver) {
        this.node = node;
        this.binding = binding;
        this.bindingAttrs = bindingAttrs;
        this.bindingContents = bindingContents;
        this.mutationObserver = mutationObserver;
    }
    update(dataName, dataValue) {
        if (this.node.nodeType === 1) {
            let index = this.bindingContents.findIndex(element => {
                return element === dataName;
            });
            if (index === -1) {
                return;
            }
            let attrName = this.bindingAttrs[index];
            let attrs = this.node.attributes;
            let attr = attrs.getNamedItem(attrName);
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
            let index = this.bindingContents.findIndex(element => {
                return element === dataName;
            });
            if (index === -1) {
                return;
            }
            this.node.nodeValue = dataValue;
        }
    }
}
export class Binding {
    constructor(id, bindingData) {
        this.id = id;
        this.data = bindingData;
        this._observers = [];
        this.compileChildNodes = true;
        this.compileAllChildNodes = false;
        this.data.addListener(this);
        observe(this);
    }
    update(dataName, dataValue) {
        this.notify(dataName, dataValue);
    }
    addListener(listener) {
        if (this._observers.find(element => {
            return element.node === listener.node;
        }) === undefined) {
            this._observers.push(listener);
        }
    }
    removeListener(listener) {
        let node;
        if (listener instanceof DOMWatcher) {
            node = listener.node;
        }
        else {
            node = listener;
        }
        let index = this._observers.findIndex(element => {
            return element.node === node;
        });
        if (index !== -1) {
            this._observers[index].mutationObserver.disconnect();
            this._observers.splice(index, 1);
        }
    }
    notify(dataName, dataValue) {
        this._observers.forEach(element => {
            element.update(dataName, dataValue);
        });
    }
    compile() {
        let node = document.getElementById(this.id);
        if (node === null) {
            throw "Can't find node by ID: " + this.id;
        }
        compile(node, this, this.compileChildNodes, this.compileAllChildNodes);
    }
    clear() {
        this._observers.forEach(element => {
            element.mutationObserver.disconnect();
        });
        this._observers = [];
        this.data.removeListener(this);
    }
}
function defineReactive(binding, key) {
    let data = binding.data.data;
    Object.defineProperty(binding, key, {
        get: function () {
            return data[key];
        },
        set: function (newValue) {
            if (newValue === binding.data[key]) {
                return;
            }
            data[key] = newValue;
            binding.data.notify(key, newValue);
        }
    });
}
function observe(binding) {
    Object.keys(binding.data.data).forEach(key => {
        defineReactive(binding, key);
    });
}
function compileTextNode(node, binding) {
    let nodevalue = node.data.trim();
    if (nodevalue.match(BINDING_REGEXP) !== null) {
        let bindingContent = nodevalue.substring(9, nodevalue.length - 1);
        if (binding[bindingContent] !== undefined) {
            node.nodeValue = binding[bindingContent];
            let mo = new MutationObserver(records => {
                records.forEach(record => {
                    let newValue = record.target.nodeValue;
                    if (record.oldValue !== newValue) {
                        binding[bindingContent] = newValue;
                    }
                });
            });
            mo.observe(node, {
                "characterData": true,
                "characterDataOldValue": true
            });
            let watcher = new DOMWatcher(node, binding, ["nodeValue"], [bindingContent], mo);
            binding.addListener(watcher);
        }
    }
    return;
}
function compileHTMLNode(node, binding, compileChildNodes, compileAllChildNodes) {
    let bindingAttrs = [];
    let bindingContents = [];
    if (node.hasAttributes()) {
        let attrs = node.attributes;
        for (let i = 0; i < attrs.length; i++) {
            let attr = attrs[i];
            let attrValue = attrs[i].nodeValue;
            if (attr.nodeValue.trim().match(BINDING_REGEXP) !== null) {
                let bindingContent = attr.nodeValue.substring(9, attr.nodeValue.length - 1);
                if (binding[bindingContent] !== undefined) {
                    bindingAttrs.push(attr.nodeName);
                    bindingContents.push(bindingContent);
                    if (attr.nodeName === "value" && (node.nodeName === "INPUT" || node.nodeName === "TEXTAREA")) {
                        node.addEventListener("input", e => {
                            let element = (e.target);
                            let value = element.value;
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
        let compileGrandsonNodes;
        if (compileAllChildNodes) {
            compileGrandsonNodes = true;
        }
        else {
            compileGrandsonNodes = false;
        }
        let frag = document.createDocumentFragment();
        let child = node.firstChild;
        while (child !== null) {
            compile(child, binding, compileGrandsonNodes, compileAllChildNodes);
            frag.appendChild(child);
            child = node.firstChild;
        }
        node.appendChild(frag);
    }
    if (bindingAttrs.length !== 0 || (compileChildNodes || compileAllChildNodes) && node.hasChildNodes()) {
        let mo = new MutationObserver(records => {
            records.forEach(record => {
                if (record.type === "attributes") {
                    let newValue = record.target.attributes.getNamedItem(record.attributeName).nodeValue;
                    if (record.oldValue !== newValue) {
                        let index = bindingAttrs.findIndex(function (value) {
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
                        record.removedNodes.forEach(element => {
                            binding.removeListener(element);
                        });
                    }
                    if (record.addedNodes !== null) {
                        record.addedNodes.forEach(element => {
                            compile(element, binding, compileChildNodes, compileChildNodes);
                        });
                    }
                }
            });
        });
        let options = {};
        if (bindingAttrs.length !== 0) {
            options.attributes = true;
            options.attributeOldValue = true;
            options.attributeFilter = bindingAttrs;
        }
        if (compileChildNodes || compileAllChildNodes) {
            options.childList = true;
        }
        mo.observe(node, options);
        let watcher = new DOMWatcher(node, binding, bindingAttrs, bindingContents, mo);
        binding.addListener(watcher);
    }
    return;
}
function compile(node, binding, compileChildNodes, compileAllChildNodes) {
    if (node.nodeType === 1) {
        compileHTMLNode(node, binding, compileChildNodes, compileAllChildNodes);
        return;
    }
    if (node.nodeType === 3) {
        compileTextNode(node, binding);
        return;
    }
}
