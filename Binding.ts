namespace SRBinding {

    /**
    * @private
    * base Binding string, example: {Binding identifier}
    */
    const BINDING_REGEXP = /^\{Binding (_|[a-zA-Z])+(\w*)\}$/;

    export let Debug = true;

    function Binding_Debug(message?: any, ...optionalParams: any[]) {
        if (Debug) {
            console.debug(message, optionalParams);
        }
    }

    interface Observer {
        update<T, U>(T, U): void;
    }

    interface Subject {
        addListener(Observer): void;
        removeListener(Observer): void;
        notify<T, U>(T, U): void;
        _observers: Observer[];
    }

    /**
     * BindingData.data is real data as binding source, you should't direct change it by BindingData.data.identifier or BindingData.data[identifier],
     * if you want to change it, you should use Binding.identifier or Binding[identifier] to indirect change it.
     */
    export class BindingData implements Subject {
        constructor(data: object) {
            this.data = data;
            this._observers = [];
        }
        data: object;
        _observers: Binding[];
        notify(dataName: string, dataValue: any) {

            Binding_Debug("BindingData %O: notify: dataName to " + dataValue, this);

            this._observers.forEach(element => {
                element.update(dataName, dataValue);
            })
        }
        addListener(listener: Binding) {

            Binding_Debug("BindingData %O: add Binding's id = " + listener.id, this);

            if (this._observers.find(element => {
                return element.id === listener.id;
            }) === undefined) {

                Binding_Debug("BindingData %O: add Binding's id = " + listener.id + "succeed!.", this);

                this._observers.push(listener);
            }
        }
        removeListener(listener: Binding | string) {
            let id: string;
            if (typeof listener === "string") {
                id = listener;
            }
            else {
                id = listener.id;
            }

            Binding_Debug("BindingData %O will remove listener ,id is " + id, this);

            let index = this._observers.findIndex(element => {
                return element.id === id;
            });
            if (index !== -1) {
                this._observers.splice(index, 1);

                Binding_Debug("BindingData %O is removed listener ,id is " + id, this);

            }
        }
        clear() {

            Binding_Debug("BindingData %O clear.", this);

            this._observers = [];
        }
    }


    class DOMWatcher implements Observer {
        constructor(node: Node, binding: Binding, bindingAttrs: string[], bindingContents: string[], mutationObserver: MutationObserver) {
            this.node = node;
            this.binding = binding;
            this.bindingAttrs = bindingAttrs;
            this.bindingContents = bindingContents;
            this.mutationObserver = mutationObserver;
        }
        update(dataName: string, dataValue: any) {

            Binding_Debug("node %O " + 　this.node + " and Binding's id " + this.binding.id + "will update.", this.node);
            Binding_Debug("the dataName is " + dataName + " to " + dataValue);

            if (this.node.nodeType === 1) {
                let index = this.bindingContents.findIndex(element => {
                    return element === dataName;
                });
                if (index === -1) {
                    // throw "data: " + dataName + " can't find!";
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
                        (<HTMLInputElement | HTMLTextAreaElement>this.node).value = dataValue;
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
        node: Node;
        binding: Binding;
        bindingAttrs: string[];
        bindingContents: string[];
        mutationObserver: MutationObserver;
    }

    export class Binding implements Subject, Observer {
        constructor(id: string, bindingData: BindingData) {
            this.id = id;
            this.data = bindingData;
            this._observers = [];
            this.compileChildNodes = true;
            this.compileAllChildNodes = false;
            this.data.addListener(this);
            observe(this);
        }
        id: string;
        data: BindingData;
        compileChildNodes: boolean;
        compileAllChildNodes: boolean;
        _observers: DOMWatcher[];
        update(dataName: string, dataValue: any) {

            Binding_Debug("Binding %O will update", this);
            Binding_Debug("dataName: " + dataName + " to " + dataValue);

            this.notify(dataName, dataValue);
        }
        addListener(listener: DOMWatcher) {

            Binding_Debug("Binding %O add listener %O", this, listener);

            if (this._observers.find(element => {
                return element.node === listener.node;
            }) === undefined) {

                Binding_Debug("Binding %O add listener %O succeed.", this, listener);

                this._observers.push(listener);
            }
        }
        removeListener(listener: DOMWatcher | Node) {
            let node: Node;
            if (listener instanceof DOMWatcher) {
                node = listener.node;
            }
            else {
                node = listener;
            }

            Binding_Debug("Binding %O will remove listener %O", this, node);

            let index = this._observers.findIndex(element => {
                return element.node === node;
            });
            if (index !== -1) {
                this._observers[index].mutationObserver.disconnect();
                this._observers.splice(index, 1);

                Binding_Debug("Binding %O is removed listener %O", this, node);
            }
        }
        notify(dataName: string, dataValue: any) {
            Binding_Debug("Binding %O notify dataName " + dataName + " to dataValue " + dataValue, this);
            this._observers.forEach(element => {
                element.update(dataName, dataValue);
            })
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

    function defineReactive(binding: Binding, key: string) {
        let data = binding.data.data;
        Object.defineProperty(binding, key, {
            get: function () {

                Binding_Debug("get " + key + " is " + data[key] + " from data %O.", data);

                return data[key];
            },
            set: function (newValue: any) {
                if (newValue === binding.data[key]) {
                    return;
                }
                data[key] = newValue;
                binding.data.notify(key, newValue);

                Binding_Debug("set " + key + " is " + newValue + "from data %O.", data);
                //console.debug("set " + key + " is " + value);
            }
        });
    }

    function observe(binding: Binding) {
        Object.keys(binding.data.data).forEach(key => {
            defineReactive(binding, key);
        });
    }

    function compileTextNode(node: CharacterData, binding: Binding) {
        let nodevalue = node.data.trim();
        if (nodevalue.match(BINDING_REGEXP) !== null) {
            let bindingContent = nodevalue.substring(9, nodevalue.length - 1);
            if (binding[bindingContent] !== undefined) {
                node.nodeValue = binding[bindingContent];

                let mo = new MutationObserver(records => {
                    records.forEach(record => {
                        let newValue = record.target.nodeValue;
                        // console.debug(record.attributeName + " from " + record.oldValue + " to " + newVal);
                        if (record.oldValue !== newValue) {
                            binding[bindingContent] = newValue;
                            Binding_Debug("Node %O's " + record.attributeName +" is changed from " + record.oldValue + " to " + newValue);
                        }
                    });
                });

                mo.observe(node, {
                    "characterData": true,
                    "characterDataOldValue": true
                });

                let watcher = new DOMWatcher(node, binding, ["nodeValue"], [bindingContent], mo);

                Binding_Debug("Build DOMWatcher %O and add it.", watcher);

                binding.addListener(watcher);
            }
        }
        return;
    }

    function compileHTMLNode(node: HTMLElement, binding: Binding, compileChildNodes: boolean, compileAllChildNodes: boolean) {
        Binding_Debug("compile HTMLNode %O with Binding %O", node, binding);
        let bindingAttrs: string[] = [];
        let bindingContents: string[] = [];
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
                                let element = <HTMLInputElement | HTMLTextAreaElement>(e.target);
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
            let compileGrandsonNodes: boolean;
            if (compileAllChildNodes) {
                compileGrandsonNodes = true;
            }
            else {
                compileGrandsonNodes = false;
            }
            let frag = document.createDocumentFragment();
            let child = node.firstChild;
            while (child !== null) {
                Binding_Debug("Compile child node.");
                compile(child, binding, compileGrandsonNodes, compileAllChildNodes);
                frag.appendChild(child);
                child = node.firstChild;
            }
            node.appendChild(frag);
        }

        if (bindingAttrs.length !== 0 || (compileChildNodes || compileAllChildNodes) && node.hasChildNodes()) {
            Binding_Debug("create mo.");
            let mo = new MutationObserver(records => {
                records.forEach(record => {
                    if (record.type === "attributes") {
                        let newValue = record.target.attributes.getNamedItem(record.attributeName).nodeValue;

                        if (record.oldValue !== newValue) {
                            let index = bindingAttrs.findIndex(function (value) {
                                return value === record.attributeName;
                            });
                            binding[bindingContents[index]] = newValue;

                            Binding_Debug("Node %O's " + record.attributeName +" is changed from " + record.oldValue + " to " + newValue);
                        }
                        if ((record.target.nodeName === "INPUT" || record.target.nodeName === "TEXTAREA") && record.attributeName === "value") {
                            (<HTMLInputElement | HTMLTextAreaElement>record.target).value = newValue;
                        }
                        return;
                    }
                    if (record.type === "childList") {
                        if (record.removedNodes !== null) {
                            record.removedNodes.forEach(element => {
                                Binding_Debug("Node %O removed from %O", element, node);
                                //这里需要递归的移除所有子节点监听
                                binding.removeListener(element);
                            });
                        }
                        if (record.addedNodes !== null) {
                            record.addedNodes.forEach(element => {
                                Binding_Debug("Node %O added to %O", element, node);
                                compile(element, binding, compileChildNodes, compileChildNodes);
                            });
                        }
                    }
                });
            });

            let options: MutationObserverInit = {};
            if (bindingAttrs.length !== 0) {
                options.attributes = true;
                options.attributeOldValue = true;
                options.attributeFilter = bindingAttrs;
            }

            if (compileChildNodes || compileAllChildNodes) {
                options.childList = true;
            }
            Binding_Debug("the mo options is %O.", options);
            mo.observe(node, options);

            let watcher = new DOMWatcher(node, binding, bindingAttrs, bindingContents, mo);
            Binding_Debug("Build DOMWatcher %O and add it.", watcher);
            binding.addListener(watcher);
        }
        return;
    }

    function compile(node: Node, binding: Binding, compileChildNodes: boolean, compileAllChildNodes: boolean) {
        if (node.nodeType === 1) {
            compileHTMLNode(<HTMLElement>node, binding, compileChildNodes, compileAllChildNodes);
            return;
        }

        if (node.nodeType === 3) {
            compileTextNode(<CharacterData>node, binding);
            return;
        }
    }
}