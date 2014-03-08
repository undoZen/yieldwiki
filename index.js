var koa = require('koa');
var app = koa();

app.use(function* () {
  this.body = true;
});

app.listen(1984);
