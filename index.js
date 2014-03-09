// from node
var path = require('path');

// from npm
var koa = require('koa');
var thunkify = require('thunkify');
var route = require('koa-route');
var views = require('co-views');

// same project
var lib = require('./lib');

// module level variables
var app = koa();
var render = views(path.join(__dirname, 'views'), {ext: 'jade'});

app.use(function* (next) {
  if (this.request.method != 'HEAD') return yield next;
  this.request.method = 'GET';
  yield next;
  this.req.method = 'HEAD';
});

app.use(function* (next) {
  if (this.request.method != 'GET') return yield next;
  var path = this.request.path;
  var queryObj = {slug: this.request.path}
  var Doc = require('./models').Doc;
  var doc = yield lib.get(queryObj);
  if (!doc) {
    this.status = 404;
    this.template = '404';
  } else {
    this.template = 'index';
    this.body = {doc: doc};
  }
  yield next;
});

app.use(function* (next) {
  if (this.template) {
    this.type = 'html';
    this.body = yield render(this.template, this.body);
  }
});

app.listen(1984);
