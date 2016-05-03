'use strict';


const fs = require('fs');
const pathUtil = require('path');

const get = require('../lib/get-annotation');


describe('get-annotation', function() {
  it('compatible with old style', function() {
    let body = fixture('t1.less');
    get(body, 'buildless').should.equal('false');
    (get(body, 'other') === null).should.be.true();

    body = fixture('t4.txt');
    get(body, 'commonjs').should.equal('false');
  });


  it('get annotation', function() {
    const body = fixture('t2.js');
    get(body, 'entry').should.be.equal(true);
    get(body, 'moduleId').should.be.equal('test/my-module');
    get(body, 'lessbuild').should.be.equal('false');
    get(body, 'path').should.be.equal('/a/b-c/hello');

    // 再来一下看看
    get(body, 'path').should.be.equal('/a/b-c/hello');
  });


  it('must be first block comment', function() {
    const body = fixture('t2.js');
    (get(body, 'preventBuild') === null).should.be.true();
  });


  it('should work with no comment', function() {
    const body = fixture('t3.less');
    (get(body, 'entry') === null).should.be.true();
  });
});


function fixture(file) {
  const path = pathUtil.join(__dirname,
      'fixtures/get-annotation', file);
  return fs.readFileSync(path, 'utf-8');
}

