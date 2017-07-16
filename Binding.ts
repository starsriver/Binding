interface Observer {
    update<T, U>(T, U): void;
}


interface Subject {
    addListener(Observer): void;
    removeListener(Observer): void;
    notify<T, U>(T, U): void;
    _observers: Observer[];
}
class BindingData implements Subject {
    constructor(data: object) {
        this.data = data;
        this._observers = [];
    }
    data: object;
    _observers: Binding[];
    notify(dataName: string, dataValue: any) {
        this._observers.forEach(element => {
            element.update(dataName, dataValue);
        })
    }
    addListener(listener: Binding) {
        if (this._observers.find(element => {
            return element === listener;
        }) === undefined) {
            this._observers.push(listener);
        }
    }
    removeListener(listener: Binding) {
        let index = this._observers.findIndex(element => {
            return element === listener;
        });
        if (index !== -1) {
            this._observers.splice(index, 1);
        }
    }
}


class DOMWatcher implements Observer {
    constructor(node: Node, binding: Binding, bindingAttrs: string[], bindingContents: string[]) {
        this.node = node;
        this.binding = binding;
        this.bindingAttrs = bindingAttrs;
        this.bindingContents = bindingContents;
    }
    update(dataName: string, dataValue: any) {
        if (this.node.nodeType === 1) {
            let index = this.bindingContents.findIndex(element => {
                return element === dataName;
            });
            if (index === -1) {
                // throw "data: " + dataName + " can't find!";
                return;
            }

            let attrName = this.bindingAttrs[index];

            if(attrName === "innerText"){
                let value = (<HTMLElement>this.node).innerText;
                if(value !== dataValue){
                    (<HTMLElement>this.node).innerText = dataValue;
                }
                return;
            }
            let attrs = this.node.attributes;
            let attr = attrs.getNamedItem(attrName);
            if (attr === null) {
                throw "Can't find attribute named " + attrName + "";
            }
            if (attr.nodeValue !== dataValue) {
                attr.nodeValue = dataValue;
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
    bindingAttrs: string[] = [];
    bindingContents: string[] = [];
}

class Binding implements Subject, Observer {
    constructor(id: string, bindingData: BindingData) {
        this.id = id;
        this.data = bindingData;
        this._observers = [];
        this.data.addListener(this);
        observe(this);
        let dom = nodeToFragment(document.getElementById(this.id), this);
        document.getElementById(this.id).appendChild(dom);
    }
    id: string;
    data: BindingData;
    _observers: Observer[];
    update(dataName: string, dataValue: any) {
        this.notify(dataName, dataValue);
    }
    addListener(listener: Observer) {
        if (this._observers.find(element => {
            return element === listener;
        }) === undefined) {
            this._observers.push(listener);
        }
    }
    removeListener(listener: Observer) {
        let index = this._observers.findIndex(element => {
            return element === listener;
        });
        if (index !== -1) {
            this._observers.splice(index, 1);
        }
    }
    notify(dataName: string, dataValue: any) {
        this._observers.forEach(element => {
            element.update(dataName, dataValue);
        })
    }
}

function defineReactive(binding: Binding, key: string) {
    let data = binding.data.data;
    Object.defineProperty(binding, key, {
        get: function () {
            //console.log("get " + key + " is " + value);
            return data[key];
        },
        set: function (newValue: any) {
            if (newValue === binding.data[key]) {
                return;
            }
            data[key] = newValue;
            binding.data.notify(key, newValue);
            //console.log("set " + key + " is " + value);
        }
    });
}

function observe(binding: Binding) {
    Object.keys(binding.data.data).forEach(key => {
        defineReactive(binding, key);
    });
}

function compile(node: Node, binding: Binding) {
    let reg = /^\{Binding (_|[a-zA-Z])+(\w*)\}$/;
    if (node.nodeType === 1) {
        let attrs = node.attributes;
        let bindingAttrs: string[] = [];
        let bindingContents: string[] = [];
        for (let i = 0; i < attrs.length; i++) {
            let attr = attrs[i];
            let attrValue = attrs[i].nodeValue;
            if (attr.nodeValue.match(reg) !== null) {
                let bindingContent = attr.nodeValue.substring(9, attr.nodeValue.length - 1);

                if (binding[bindingContent] !== undefined) {
                    bindingAttrs.push(attr.nodeName);
                    bindingContents.push(bindingContent);

                    if (attr.nodeName === "value" && (node.nodeName === "INPUT" || node.nodeName === "TEXTAREA")) {
                        node.addEventListener("input", e => {
                            let element = <HTMLInputElement | HTMLTextAreaElement>(e.target);
                            element.setAttribute("value", element.value);
                        }, false);
                    }

                    attr.nodeValue = binding[bindingContent];
                }
            }
        }
        if((<HTMLElement>node).innerText.match(reg) !== null){
            let bindingContent = (<HTMLElement>node).innerText.substring(9, (<HTMLElement>node).innerText.length - 1);
            if(binding[bindingContent] !== undefined){
                bindingAttrs.push("innerText");
                bindingContents.push(bindingContent);

                (<HTMLElement>node).innerText = binding[bindingContent];
            }
        }

        if (bindingAttrs.length !== 0) {
            let mo = new MutationObserver(records => {
                records.forEach(record => {
                    if (record.type === "attributes") {
                        let newValue = record.target.attributes.getNamedItem(record.attributeName).nodeValue;

                        // console.log(record.attributeName + " from " + record.oldValue + " to " + newValue);

                        if (record.oldValue !== newValue) {
                            let index = bindingAttrs.findIndex(function (value) {
                                return value === record.attributeName;
                            });
                            binding[bindingContents[index]] = newValue;
                        }

                        return;
                    }
                    if(record.type === "characterData"){
                        let newValue = (<CharacterData>record.target).data;
                        if (record.oldValue !== newValue) {
                            let index = bindingAttrs.findIndex(function (value) {
                                return value === "innerText";
                            });
                            binding[bindingContents[index]] = newValue;
                        }

                        return;
                    }
                });
            });

            mo.observe(node, {
                "attributes": true,
                "attributeOldValue": true,
                "characterData": true,
                "characterDataOldValue": true,
                "subtree": true,
                "attributeFilter": bindingAttrs
            });

            let watcher = new DOMWatcher(node, binding, bindingAttrs, bindingContents);
            binding.addListener(watcher);
        }
        return;
    }

    if (node.nodeType === 3) {
        let nodevalue = (<Text>node).wholeText.trim();
        if (nodevalue.match(reg) !== null) {
            let bindingContent = nodevalue.substring(9, nodevalue.length - 1);
            if (binding[bindingContent] !== undefined) {
                node.nodeValue = binding[bindingContent];

                let mo = new MutationObserver(records => {
                    records.forEach(record => {
                        let newVal = record.target.nodeValue;
                        // console.log(record.attributeName + " from " + record.oldValue + " to " + newVal);
                        if (record.oldValue !== newVal) {
                            binding[bindingContent] = newVal;
                        }
                    });
                });

                mo.observe(node, {
                    "characterData": true,
                    "characterDataOldValue": true
                });

                let watcher = new DOMWatcher(node, binding, ["nodeValue"], [bindingContent]);
                binding.addListener(watcher);
            }
        }
        return;
    }
    return;
}

function nodeToFragment(node: HTMLElement, binding: Binding) {
    let frag = document.createDocumentFragment();
    let child = node.firstChild;
    while (child !== null) {
        compile(child, binding);
        frag.appendChild(child);
        child = node.firstChild;
    }
    return frag;
}