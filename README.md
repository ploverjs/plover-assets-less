# plover-assets-less


[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]


plover less插件，支持`@import`和`url()`对其他模块资源的引入。


## Installing

```sh
npm install --save plover-assets-less
```

## Usage

```css
// 引入common模块的reset样式，所在模块目录为common/assets/css/reset.less
@import 'common:reset';

@border__color: #e8e8e8;

.spliter {
  border-right: 1px solid @border__color;
}

.icon__back {
  // 引入common模块的back图片，所在模块目录为common/assets/img/icons/back.png
  background-image: url('common:icons/back.png');
}
```

[npm-image]: https://img.shields.io/npm/v/plover-assets-less.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/plover-assets-less
[travis-image]: https://img.shields.io/travis/plover-modules/plover-assets-less/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/plover-modules/plover-assets-less
[coveralls-image]: https://img.shields.io/codecov/c/github/plover-modules/plover-assets-less.svg?style=flat-square
[coveralls-url]: https://codecov.io/github/plover-modules/plover-assets-less?branch=master

