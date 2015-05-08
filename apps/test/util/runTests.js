var which = require('npm-which')(__dirname).sync;
var mochify = require('mochify');
var http = require('http');

// TODO (brent) When we move to npm/gulp, we will want to take care of this
// logic in our gulpfile instead
// Right now we manually create a symbolic link to @cdo/apps
var fs = require('fs');
var exec = require('child_process').exec;
var target = __dirname + '/../../src/';
var nodePath = __dirname + '/../../node_modules/@cdo/apps';
var command = '';
if (!fs.existsSync(target)) {
  command = 'ln -s ' + target + ' ' + nodePath;
}


/**
 * Mochify uses phantomic to run a server that it connects to, which serves up
 * the generated bundle. I couldn't find a way to get it to serve up non-bundle
 * code as well. Instead, I'm creating my own server which serves up files
 * from cdo/apps/lib. This way I can script inject some necessary files.
 */
function httpServer(port, callback) {
  var server = http.createServer(function (req, res) {
    var url = req.url;
    var p = url.indexOf('?');
    if (p !== -1) {
      url = url.substring(0, p);
    }
    var filepath = __dirname + '/../../lib' + url;
    if (!fs.existsSync(filepath)) {
      res.writeHead(404);
      res.end();
    } else {
      res.writeHead(200);
      fs.createReadStream(filepath).pipe(res);
    }
  });
  server.timeout = 0;
  server.listen(port);
  return server;
}

var libServer = httpServer(8001);

exec(command, function (err, stdout, stderr) {
  if (err) {
    console.log(err);
    return;
  }

  var globs = [
    './test/*.js',
    './test/calc/*.js',
    './test/netsim/*.js'
  ];
  mochify(globs.join(' '), {
    grep: process.env.mocha_grep,
    debug: process.env.mocha_debug,
    reporter : 'spec',
    timeout: 10000,
    phantomjs: which('phantomjs'),
    transform: 'ejsify',
    colors: true,
    color: true
  }).bundle().on('end', function () {
    libServer.close();
  });
});
