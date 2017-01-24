'use strict';


const fs = require('fs');
const pathUtil = require('path');
const crypto = require('crypto');
const getAnnotation = require('get-annotation');


const logger = require('plover-logger')('plover-assets-less');



module.exports = PloverAssetsHandlerLess;


function* PloverAssetsHandlerLess(path, source, info, options) {
  if (shouldIgnore(path, source)) {
    logger.info('ignore build: %s', path);
    return false;
  }

  const settings = options.settings;

  logger.info('build %s', path);
  const less = require('less');
  const opts = getOptions(settings, info, path);
  return yield less.render(source, opts).then(o => {
    return filterCss(path, o.css, info, options);
  });
}


function getOptions(settings, info, path) {
  const opts = {};
  Object.assign(opts, (settings.assets || {}).less);

  opts.filename = path;

  opts.paths = (opts.paths || []).concat([
    // 以下目录添加到less编译上下文
    // 模块目录
    info.path,
    // 模块node_modules目录
    pathUtil.join(info.path, 'node_modules'),
    // 应用目录
    settings.applicationRoot,
    // 应用node_modules目录
    pathUtil.join(settings.applicationRoot, 'node_modules')
  ]);

  opts.compress = !settings.development;

  // 开发态加soucemap支持
  if (settings.development && !opts.sourceMap) {
    opts.sourceMap = {
      outputSourceFiles: true,
      sourceMapFileInline: true
    };
  }

  return opts;
}


function shouldIgnore(path, source) {
  // 忽略直接编译下划线开头的less文件
  if (pathUtil.basename(path).startsWith('_')) {
    return true;
  }
  return getAnnotation(source, 'compile') === false;
}


const rUrl = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/g;
const rImport = /@import\s+['"]([^'"]+)['"]/g;
const rAbs = /^(\w+:)?\//;
const rData = /^data:/;
const rRemote = /^([^:]+):(.+)$/;


/**
 * 处理css中的相对url路径，因为css可能被concat
 * 所以需要把他处理成绝对的，否则会访问不到
 *
 * @param {String}  path    - 文件路径
 * @param {String}  css     - 样式内容
 * @param {String}  info   - 模块信息
 * @param {Object}  options - 额外对象
 * @return {String}         - 返回过滤后的css
 */
function filterCss(path, css, info, options) {
  const settings = options.settings;

  const o = {
    info: info,
    path: path,
    urlPrefix: getUrlPrefix(settings),
    moduleResolver: options.moduleResolver,
    settings: settings,
    compile: options.compile
  };

  css = css.replace(rUrl, function(all, url) {
    return 'url(' + filterUrl(o, url) + ')';
  });

  css = css.replace(rImport, function(all, url) {
    return '@import "' + filterUrl(o, url) + '"';
  });

  return css;
}


/* eslint complexity: [2, 10] */
function filterUrl(o, url) {
  // 绝对地址不处理
  if (rAbs.test(url) || rData.test(url)) {
    return url;
  }

  // 资源根目录
  const aroot = pathUtil.join(o.info.path, o.info.assetsRoot || '');
  // 当前文件目录相对资源根目录地址
  const rdir = pathUtil.dirname(pathUtil.relative(aroot, o.path));

  let info = o.info;
  let rpath = null;
  const match = rRemote.exec(url);
  if (match) {
    // 跨模块地址
    info = o.moduleResolver.resolve(match[1]);
    if (!info) {
      throw new Error('can not find module: ' + match[1]);
    }
    rpath = match[2];
  } else {
    // 相对于当前文件
    rpath = pathUtil.join(rdir, url).replace(/\\/g, '/');
  }

  rpath = rpath.replace(/\?.*$/, '');
  const resPath = pathUtil.join(info.path, info.assetsRoot, rpath);
  if (fs.existsSync(resPath)) {
    rpath = o.compile ? getDigestPath(rpath, resPath) : rpath;
  } else {
    logger.warn('resouce not exists: %s, reference by %s', resPath, o.path);
  }

  url = o.urlPrefix + '/' + info.name + '/' + rpath;
  return url;
}


function getUrlPrefix(settings) {
  const assets = settings.assets || {};
  const prefix = assets.prefix || '/g';
  return settings.development ? prefix :
      (assets.urlPrefix || prefix);
}


function getDigestPath(rpath, resPath) {
  const hash = getFileHash(resPath);
  rpath = rpath.replace(/(\.\w+)$/, `-${hash}$1`);
  return rpath;
}


function getFileHash(path) {
  const shasum = crypto.createHash('sha1');
  const buf = fs.readFileSync(path);
  shasum.update(buf);
  return shasum.digest('hex').substr(0, 10);
}
