'use strict';

var marked = require('marked');
var _ = require('underscore');
var thunkify = require('thunkify');
var Doc = require('./models').Doc;

var reflink = /\[((?:\[[^\]]*\]|[^\]]|\](?=[^\[]*\]))*)\]\s*\[([^\]]*)\]/g;

marked.setOptions({
  gfm: true,
  breaks: true,
});

var getTitles = exports.getTitles = function *(slugs) {
  var find = thunkify(Doc.find).bind(Doc);
  var queryObj = {slug: {$in: slugs}, history: false, published: true};
  var docs = yield find(queryObj);
  var result = {}
  _.each(docs, function (doc) {
    result[doc.slug] = doc.title;
  });
  return result;
}

function addInnerLink(html, titles) {
  return html.replace(reflink, function (all, title, slug) {
    if (!slug) return title;
    if (slug[0] != '/') slug = '/' + slug;
    title = title || titles[slug] || slug.replace(/^\//,'')
    return '<a href="' + slug + '">' + title + '</a>';
  });
}

function *decInnerLink(doc) {
  var titles = yield getTitles(doc.links_to);
  doc.html = addInnerLink(doc.html, titles);
  return doc;
}

function decLinksTo(doc) {
  doc.links_to = []
  doc.html.replace(reflink, function (all, title, slug) {
    if (slug) doc.links_to.push(slug[0] == '/' ? slug : '/' + slug);
  });
  return doc;
}

function decTitle(doc) {
  doc.html.replace(/<h1[^>]*>([^\n]+)<\/h1>/i, function (all, title) {
    doc.title = title;
  });
  if (!doc.title) doc.title = doc.slug;
  return doc;
}

var findDoc = thunkify(Doc.findOne).bind(Doc);
var updateDoc = thunkify(Doc.update).bind(Doc);

exports.get = function *(queryObj, cb) {
  if ('string' == typeof queryObj) queryObj = {slug: queryObj};
  queryObj = _.pick(queryObj, 'slug', 'published');
  queryObj.history = false;
  var doc = yield findDoc(queryObj);
  if (!doc) return doc;
  return yield decInnerLink(doc);
};

exports.put = function *(doc) {
  var oldDoc = yield findDoc({slug: doc.slug});
  yield updateDoc({slug: doc.slug}, {history: true}, {multi: true});
  doc = _.extend({
    created_at: oldDoc ? oldDoc.created_at : Date.now(),
    modified_at: Date.now()
  }, doc);
  doc.html = marked(doc.content)
  doc = decLinksTo(doc);
  doc = decTitle(doc);
  yield thunkify(Doc.prototype.save).apply(new Doc(doc));
  return yield decInnerLink(doc);
}
