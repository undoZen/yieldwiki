var path = require('path');
var koa = require('koa');
var thunkify = require('thunkify');
var route = require('koa-route');
var views = require('co-views');
var render = views(path.join(__dirname, 'views'), {ext: 'jade'});
var lib = require('./lib');
var app = koa();

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
  this.template = 'index';
  this.body = {};
  this.body.doc = yield lib.get(queryObj);
  yield next;
});

app.use(function* (next) {
  if (this.template) {
    this.type = 'html';
    this.body = yield render(this.template, this.body);
  }
});

app.listen(1984);
