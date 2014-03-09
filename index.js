// from node
var path = require('path');

// from npm
var koa = require('koa');
var _ = require('underscore');
_.extend(koa, require('koa-common'));
var thunkify = require('thunkify');
var route = require('koa-route');
var views = require('co-views');
var parse = require('co-body');

// same project
var lib = require('./lib');
var config = require('./config');

// module level variables
var app = koa();
var render = views(path.join(__dirname, 'views'), {ext: 'jade'});

require('koa/lib/context').__defineGetter__('xhr', function(){
  var val = this.get('X-Requested-With') || '';
  return 'xmlhttprequest' == val.toLowerCase();
});

app.use(function* (next) {
  if (this.request.method != 'HEAD') return yield next;
  this.request.method = 'GET';
  yield next;
  this.req.method = 'HEAD';
});

app.use(koa.favicon());
app.use(koa.mount('/static', koa.static(path.join(__dirname, 'static'))));

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
    doc = _.extend({}, doc);
    this.body = {doc: doc};
  }
  yield next;
});

app.use(function* (next) {
  if (this.request.method != 'PUT') return yield next;
  var path = this.request.path;
  var body = yield parse(this);
  if (body.password != config.password) {
    this.status = 403;
    return;
  }
  var doc = _.extend({}, body, {slug: path});
  doc = yield lib.put(doc);
  if (this.accepts('json') || this.xhr) {
    this.type = 'json';
    this.body = {success: true, html: doc.html};
  } else {
    this.redirect(path);
  }
})

app.use(function* (next) {
  if (this.template) {
    this.type = 'html';
    var locals = _.extend(this.body || {}, {salt: config.salt});
    this.body = yield render(this.template, locals);
  }
});

app.listen(process.env.PORT || 1984);
