'use strict';


const fs = require('fs');
const pathUtil = require('path');
const co = require('co');
const compileLess = require('../lib/less-handler');


describe('less-handler', function() {
  const root = pathUtil.join(__dirname, 'fixtures/less-handler');

  const info = {
    name: 'less-test',
    path: root,
    assetsRoot: ''
  };

  const options = {
    moduleResolver: {
      resolve: function(name) {
        return {
          name: name,
          version: '1.0.0',
          path: root,
          assetsRoot: ''
        };
      }
    },

    settings: {
      applicationRoot: root
    },

    buildConfig: {
      less: {
        compress: false
      }
    }
  };


  function* compile(path) {
    const fixture = createFixture(path);
    return yield compileLess(fixture.path, fixture.body, info, options);
  }


  function createFixture(path) {
    path = pathUtil.join(root, path);
    return {
      path: path,
      body: fs.readFileSync(path, 'utf-8').trim()
    };
  }


  it('should compile less file', function() {
    return co(function* () {
      const css = yield* compile('simple.less');
      const fixture = createFixture('simple.css');
      css.should.be.equal(fixture.body);
    });
  });


  it('should ignore compile with `@compile:false`', function() {
    return co(function* () {
      const css = yield* compile('ignore.less');
      css.should.be.false();
    });
  });


  it('compatible with old ignore style', function() {
    return co(function* () {
      const css = yield* compile('ignore-compatible.less');
      css.should.be.false();
    });
  });


  it('ignore less file prefix with underscore', function() {
    return co(function* () {
      const css = yield* compile('_util.less');
      css.should.be.false();
    });
  });


  it('relative url will be transform to absolute path', function() {
    return co(function* () {
      let css = yield* compile('css/filter-url.less');
      css = css.replace(/\?_=\d+/g, '');
      const fixture = createFixture('css/filter-url.css');
      const expect = fixture.body.replace(/\n/g, '');
      css.should.be.equal(expect);
    });
  });


  it('use functions plugin', function() {
    return co(function* () {
      const css = yield* compile('functions.less');
      css.should.be.equal('body{font-size:42em}');
    });
  });
});

