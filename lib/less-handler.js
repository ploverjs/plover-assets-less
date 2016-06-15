'use strict';


const fs = require('fs');
const pathUtil = require('path');
const getAnnotation = require('get-annotation');
const assetsUtil = require('plover-assets-util');


const logger = require('plover-logger')('plover-assets:handler/less');


module.exports = PloverAssetsHandlerLess;


function* PloverAssetsHandlerLess(path, source, info, options) {
  if (shouldIgnore(path, source)) {
    logger.info('ignore build: %s', path);
    return false;
  }

  // 默认添加less fun插件
  const lessFuncs = new (require('less-plugin-functions'))();

  const settings = options.settings;
  const opts = {
    filename: path,

    // 以下目录添加到less编译上下文
    paths: [
      // 模块目录
      info.path,
      // 模块node_modules目录
      pathUtil.join(info.path, 'node_modules'),
      // 应用目录
      settings.applicationRoot,
      // 应用node_modules目录
      pathUtil.join(settings.applicationRoot, 'node_modules')
    ],

    plugins: [lessFuncs],

    compress: !settings.development
  };

  // 开发态加soucemap支持
  if (settings.development) {
    opts.sourceMap = {
      outputSourceFiles: true,
      sourceMapFileInline: true
    };
  }

  logger.info('build %s', path);

  const less = require('less');
  return yield less.render(source, opts).then(o => {
    return filterCss(path, o.css, info, options);
  });
}


function shouldIgnore(path, source) {
  // 忽略直接编译下划线开头的less文件
  if (pathUtil.basename(path).startsWith('_')) {
    return true;
  }

  const ignore = getAnnotation(source, 'compile') === false ||
      getAnnotation(source, 'ignore');  // 兼容原来的配置

  return ignore;
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
 * @param {String}  path    - 路径
 * @param {String}  css     - 样式内容
 * @param {String}  minfo   - 模块信息
 * @param {Object}  options - 额外对象
 * @return {String}         - 返回过滤后的css
 */
function filterCss(path, css, minfo, options) {
  const settings = options.settings;
  const moduleResolver = options.moduleResolver;
  const urlPattern = getUrlPattern(settings);

  // 资源根目录
  const aroot = pathUtil.join(minfo.path, minfo.assetsRoot || '');
  // 当前文件目录相对资源根目录地址
  const rdir = pathUtil.dirname(pathUtil.relative(aroot, path));


  const filterUrl = function(url) {
    // 绝对地址不处理
    if (rAbs.test(url) || rData.test(url)) {
      return url;
    }

    let info = minfo;
    let rpath = null;
    const match = rRemote.exec(url);
    if (match) {
      // 跨模块地址
      info = moduleResolver.resolve(match[1]);
      if (!info) {
        throw new Error('can not find module: ' + match[1]);
      }
      rpath = match[2];
    } else {
      // 相对于当前文件
      rpath = pathUtil.join(rdir, url).replace(/\\/g, '/');
    }

    checkExists(info, path, rpath);

    url = assetsUtil.template(urlPattern, {
      name: info.name,
      version: info.version,
      path: rpath
    });

    return url;
  };

  css = css.replace(rUrl, function(all, url) {
    return 'url(' + filterUrl(url) + ')';
  });

  css = css.replace(rImport, function(all, url) {
    return '@import "' + filterUrl(url) + '"';
  });

  return css;
}


function getUrlPattern(settings) {
  const assets = settings.assets || {};
  const prefix = assets.prefix || '/g';

  const defaultPattern = prefix + '/{name}/{path}';
  return settings.development ? defaultPattern :
      (assets.urlPattern || defaultPattern);
}


/*
 * 检查一下引用的资源是否存在
 * 如果不存在出个警告
 */
function checkExists(info, path, rpath) {
  rpath = rpath.replace(/\?.*$/, '');
  const resPath = pathUtil.join(info.path, info.assetsRoot, rpath);
  if (!fs.existsSync(resPath)) {
    logger.warn('resouce not exists, module: %s, less path: %s, res: %s',
        info.name, path, resPath);
  }
}

