// <video src="{Binding aa}">
// {Binding aa}

// let BindingOption = {
//     id:"app",
//     data:{
//         class:h,
//         weight:180
//     }
// }
class BindingOption {
    constructor(id: string, data: object) {
        this.id = id;
        this.data = data;
    }
    id: string;
    data: object;
}

function defineReactive(bindingData: object, key: string, val: any) {
    Object.defineProperty(bindingData, key, {
        get: function () {
            console.log("get " + key + " is " + val);
            return val;
        },
        set: function (newVal: any) {
            if (newVal === val) {
                return;
            }
            val = newVal;
            console.log("set " + key + " is " + val);
        }
    });
}

function observe(bindingData: object) {
    Object.keys(bindingData).forEach(key => {
        defineReactive(bindingData, key, bindingData[key]);
    });
}

function compile(node: Node, binding: BindingOption) {
    let reg = /\{Binding (_|[a-zA-Z])+(\w*)\}/;
    if (node.nodeType === 1) {
        console.log(node.nodeName);
        let attrs = node.attributes;
        let bindingAttrs: string[] = [];
        let bindingContents: string[] = [];
        for (let i = 0; i < attrs.length; i++) {
            let attr = attrs[i];
            let attrValue = attrs[i].nodeValue;
            if (attr.nodeValue.match(reg) !== null) {
                let bindingContent = attr.nodeValue.substring(9, attr.nodeValue.length - 1);

                if (binding.data[bindingContent] !== undefined) {
                    bindingAttrs.push(attr.nodeName);
                    bindingContents.push(bindingContent);

                    attr.nodeValue = binding.data[bindingContent];
                }
            }
        }
        if (bindingAttrs.length !== 0) {
            let mo = new MutationObserver(records => {
                records.forEach(record => {
                    let newVal = record.target.attributes.getNamedItem(record.attributeName).nodeValue;

                    console.log(record.attributeName + " from " + record.oldValue + " to " + newVal);

                    if (record.oldValue !== newVal) {
                        let index = bindingAttrs.findIndex(function (value) {
                            return value === record.attributeName;
                        });
                        binding.data[bindingContents[index]] = newVal;
                    }
                });
            });

            mo.observe(node, {
                "attributes": true,
                "attributeOldValue": true,
                "attributeFilter": bindingAttrs
            });
        }
        return;
    }

    if (node.nodeType === 3) {
        let nodevalue = (<Text>node).wholeText.trim();
        if (nodevalue.match(reg) !== null) {
            let bindingContent = nodevalue.substring(9, nodevalue.length - 1);
            if (binding.data[bindingContent] !== undefined) {
                node.nodeValue = binding.data[bindingContent];
            }
        }
        return;
    }
    return;
}

function nodeToFragment(node: HTMLElement, binding: BindingOption) {
    let frag = document.createDocumentFragment();
    let child = node.firstChild;
    while (child !== null) {
        compile(child, binding);
        frag.appendChild(child);
        child = node.firstChild;
    }
    return frag;
}

class Binding {
    constructor(binding: BindingOption) {
        this.id = binding.id;
        this.data = binding.data;
        observe(this.data);
        let dom = nodeToFragment(document.getElementById(this.id), binding);
        document.getElementById(this.id).appendChild(dom);
    }
    id: string;
    data: object;
}