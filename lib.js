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

var addInnerLink = exports.addInnerLink = function (html, titles) {
  return html.replace(reflink, function (all, title, slug) {
    if (!slug) return title;
    if (slug[0] != '/') slug = '/' + slug;
    title = title || titles[slug] || slug.replace(/^\//,'')
    return '<a href="' + slug + '">' + title + '</a>';
  });
}

exports.get = function *(queryObj, cb) {
  var findDoc = thunkify(Doc.findOne).bind(Doc);
  if ('string' == typeof queryObj) queryObj = {slug: queryObj};
  queryObj = _.pick(queryObj, 'slug', 'published');
  queryObj.history = false;
  var doc = yield findDoc(queryObj);
  if (!doc) return doc;
  var titles = yield getTitles(doc.links_to);
  doc.html = addInnerLink(doc.html, titles);
  return doc;
};
