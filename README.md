# Binding_js

## Overview :

binding_js implementing two-way binding in HTMLElementNode's attributes or TextNode between JavaScript's object.

binging_js 实现了HTML节点属性或文本节点与JavaScript对象之间的双向绑定。

## Install

```bash
npm install binding_js --save;
```

or using script Tab.

或使用script标签。
```html
<script src="binding.min.js"></script>
```

## Use Cases :

1. import BindingData and Binding:

   导入BindingData和Binding对象：

```js
var {BindingData, Binding} = require(binding_js);
// or
import {BindingData, Binding} from "binding_js";
// in Browser, please use require to import because binding_js use browserify to make package.
// 在浏览器，请使用require来导入对象因为binding_js使用了browserify工具来打包。
```

2. create BindingData object:

   创建BindingData对象：

```js
var bindingData = new BindingData({
    textNodeContent:"this text will show in textNode",
    inputUrl:"https://github.com/starsriver/Binding",
    tabAContent:"this is binding_js's github",
    inputValue: 123456
});
```

3. add HTML and set binding target:

   添加HTML并设置绑定目标：
```html
<div id="bindingExample">
    {Binding textNodeContent}
    <a href="{Binding inputUrl}">{Binding tabAContent}</a>
    <input type="text" value="{inputValue}"></input>
</div>
```

4. create Binging Object and set options(optional):

   创建Binding 对象并 设置选项(可选)：
```js
var bindingTest = new Binding("bindingExample", bindingDataTest);
// bindingTest.compileChildNodes = true;
// bindingTest.compileAllChildNodes = true;
```

5. start binding:

   启用绑定：
```js
bindingTest.compile();
```

## 
## Build

## License:

GPL-2.0 .