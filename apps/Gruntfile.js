var path = require('path');

var config = {};

var APPS = [
  'maze',
  'turtle',
  'bounce',
  'flappy',
  'studio',
  'jigsaw',
  'calc',
  'applab',
  'eval',
  'netsim'
];

if (process.env.MOOC_APP) {
  var app = process.env.MOOC_APP;
  if (APPS.indexOf(app) === -1) {
    throw new Error('Unknown app: ' + app);
  }
  APPS = [app];
}

// Parse options from environment.
var MINIFY = (process.env.MOOC_MINIFY === '1');
var LOCALIZE = (process.env.MOOC_LOCALIZE === '1');
var DEV = (process.env.MOOC_DEV === '1');

var LOCALES = (LOCALIZE ? [
  'ar_sa',
  'az_az',
  'bg_bg',
  'bn_bd',
  'ca_es',
  'cs_cz',
  'da_dk',
  'de_de',
  'el_gr',
  'en_us',
  'en_ploc',
  'es_es',
  'eu_es',
  'fa_ir',
  'fi_fi',
  'fil_ph',
  'fr_fr',
  'he_il',
  'hi_in',
  'hr_hr',
  'hu_hu',
  'id_id',
  'is_is',
  'it_it',
  'ja_jp',
  'ko_kr',
  'lt_lt',
  'lv_lv',
  'ms_my',
  'nl_nl',
  'nn_no',
  'no_no',
  'pl_pl',
  'pt_br',
  'pt_pt',
  'ro_ro',
  'ru_ru',
  'sk_sk',
  'sl_si',
  'sq_al',
  'sr_sp',
  'sv_se',
  'ta_in',
  'th_th',
  'tr_tr',
  'uk_ua',
  'ur_pk',
  'vi_vn',
  'zh_cn',
  'zh_tw'
] : [
  'en_us',
  'en_ploc'
]);

// if specified will, will build en_us, en_ploc, and specified locale
if (process.env.MOOC_LOCALE) {
  LOCALES.push(process.env.MOOC_LOCALE);
}

config.clean = {
  all: ['build']
};

var ace_suffix = DEV ? '' : '-min';
var dotMinIfNotDev = DEV ? '' : '.min';

config.copy = {
  src: {
    files: [
      {
        expand: true,
        cwd: 'src/',
        src: ['**/*.js', '**/*.jsx'],
        dest: 'build/js'
      }
    ]
  },
  static: {
    files: [
      {
        expand: true,
        cwd: 'static/',
        src: ['**'],
        dest: 'build/package/media'
      },
      {
        expand: true,
        cwd: 'lib/blockly/media',
        src: ['**'],
        //TODO: Would be preferrable to separate Blockly media.
        dest: 'build/package/media'
      },
      {
        expand: true,
        cwd: 'style/applab',
        src: ['*.css'],
        dest: 'build/package/css'
      }
    ]
  },
  lib: {
    files: [
      {
        expand: true,
        cwd: 'lib/blockly',
        src: ['??_??.js'],
        dest: 'build/package/js',
        // e.g., ar_sa.js -> ar_sa/blockly_locale.js
        rename: function(dest, src) {
          var outputPath = src.replace(/(.{2}_.{2})\.js/g, '$1/blockly_locale.js');
          return path.join(dest, outputPath);
        }
      },
      {
        expand: true,
        cwd: 'lib/ace/src' + ace_suffix + '-noconflict/',
        src: ['**/*.js'],
        dest: 'build/package/js/ace/'
      },
      {
        expand: true,
        cwd: 'lib/droplet',
        src: ['droplet-full' + dotMinIfNotDev + '.js'],
        dest: 'build/package/js/droplet/',
        rename: function (src, dest) {
          // dest name should be the same, whether or not minified
          return src + dest.replace(/\.min.js$/, '.js');
        }
      },
      {
        expand: true,
        cwd: 'lib/droplet',
        src: ['droplet.min.css'],
        dest: 'build/package/css/droplet/'
      },
      {
        expand: true,
        cwd: 'lib/tooltipster',
        src: ['jquery.tooltipster' + dotMinIfNotDev + '.js'],
        dest: 'build/package/js/tooltipster/',
        rename: function (src, dest) {
          // dest name should be the same, whether or not minified
          return src + dest.replace(/\.min.js$/, '.js');
        }
      },
      {
        expand: true,
        cwd: 'lib/marked',
        src: ['marked' + dotMinIfNotDev + '.js'],
        dest: 'build/package/js/marked/',
        rename: function (src, dest) {
          // dest name should be the same, whether or not minified
          return src + dest.replace(/\.min.js$/, '.js');
        }
      },
      {
        expand: true,
        cwd: 'lib/tooltipster',
        src: ['tooltipster.min.css'],
        dest: 'build/package/css/tooltipster/'
      },
      {
        expand: true,
        cwd: 'lib/jsinterpreter',
        src: ['*.js'],
        dest: 'build/package/js/jsinterpreter/'
      }
    ]
  }
};

config.digest = {
  options: {
    out: 'build/package/js/manifest.js'
  },
  files: {
    src: ['build/package/js/**/*.js', '!build/package/js/ace/**/*.js']
  }
};

config.lodash = {
  'build': {
    'dest': 'src/lodash.js',
    'options': {
      'include': [
        'debounce', 'reject', 'map', 'value', 'range', 'without', 'sample',
        'create', 'flatten', 'isEmpty', 'wrap', 'size', 'bind', 'contains',
        'last', 'clone', 'isEqual', 'find', 'sortBy']
    }
  }
};

config.sass = {
  all: {
    options: {
      outputStyle: (MINIFY ? 'compressed' : 'nested'),
      includePaths: ['../shared/css/']
    },
    files: {
      'build/package/css/common.css': 'style/common.scss',
      'build/package/css/readonly.css': 'style/readonly.scss'
    }
  }
};
APPS.filter(function (app) { return app != 'none'; }).forEach(function(app) {
  var src = 'style/' + app + '/style.scss';
  var dest = 'build/package/css/' + app + '.css';
  config.sass.all.files[dest] = src;
});

config.pseudoloc = {
  all: {
    srcBase: 'i18n',
    srcLocale: 'en_us',
    destBase: 'build/i18n',
    pseudoLocale: 'en_ploc'
  }
};

// Takes a key-value .json file and runs it through MessageFormat to create a localized .js file.
config.messages = {
  all: {
    files: [
      {
        // e.g., build/js/i18n/bounce/ar_sa.json -> build/package/js/ar_sa/bounce_locale.js
        rename: function(dest, src) {
          var outputPath = src.replace(/(build\/)?i18n\/(\w*)\/(\w+_\w+).json/g, '$3/$2_locale.js');
          return path.join(dest, outputPath);
        },
        expand: true,
        src: ['i18n/**/*.json', 'build/i18n/**/*.json'],
        dest: 'build/package/js/'
      }
    ]
  }
};

config.ejs = {
  all: {
    srcBase: 'src',
    destBase: 'build/js'
  }
};

var allFilesSrc = [];
var allFilesDest = [];
var outputDir = 'build/package/js/';
APPS.forEach(function (app) {
  allFilesSrc.push('build/js/' + app + '/main.js');
  allFilesDest.push(outputDir+app+'.js');
});

// Use command-line tools to run browserify (faster/more stable this way)
var browserifyExec = 'mkdir -p build/browserified && `npm bin`/browserify ' +
  '-t reactify --extension=.jsx ' + allFilesSrc.join(' ') +
  (APPS.length > 1 ? ' -p [ factor-bundle -o ' + allFilesDest.join(' -o ') + ' ] -o ' + outputDir + 'common.js' :
  ' -o ' + allFilesDest[0]);

config.exec = {
  browserify: browserifyExec,
  watchify: browserifyExec.replace('browserify', 'watchify') + ' -v',
  mochaTest: 'node test/util/runTests.js --color'
};

var ext = DEV ? 'uncompressed' : 'compressed';
config.concat = {
  vendor: {
    nonull: true,
    src: [
      'lib/blockly/blockly_' + ext + '.js',
      'lib/blockly/blocks_' + ext + '.js',
      'lib/blockly/javascript_' + ext + '.js'
    ],
    dest: 'build/package/js/blockly.js'
  }
};

config.express = {
  server: {
    options: {
      port: 8000,
      bases: path.resolve(__dirname, 'build/package'),
      server: path.resolve(__dirname, './src/dev/server.js'),
      livereload: true
    }
  }
};

var uglifiedFiles = {};
config.uglify = {
  browserified: {
    files: uglifiedFiles
  }
};

['common'].concat(APPS).forEach(function (app) {
  var src = outputDir + app + '.js';
  var dest = outputDir + app + '.min.js';
  uglifiedFiles[dest] = [src];
  var appUglifiedFiles = {};
  appUglifiedFiles[dest] = [src];
  config.uglify[app] = {files: appUglifiedFiles };
});

// Run uglify task across all apps in parallel
config.concurrent = {
  uglify: APPS.concat('common').map( function (x) {
    return 'uglify:' + x;
  })
};

config.watch = {
  js: {
    files: ['src/**/*.js'],
    tasks: ['newer:copy:src']
  },
  style: {
    files: ['style/**/*.scss', 'style/**/*.sass'],
    tasks: ['newer:sass']
  },
  content: {
    files: ['static/**/*'],
    tasks: ['newer:copy']
  },
  vendor_js: {
    files: ['lib/**/*.js'],
    tasks: ['newer:concat', 'newer:copy:lib']
  },
  ejs: {
    files: ['src/**/*.ejs'],
    tasks: ['ejs']
  },
  messages: {
    files: ['i18n/**/*.json'],
    tasks: ['pseudoloc', 'messages']
  },
  dist: {
    files: ['build/package/**/*'],
    options: {
      livereload: true
    }
  }
};

config.jshint = {
  options: {
    curly: true,
    node: true,
    mocha: true,
    browser: true,
    undef: true,
    globals: {
      Blockly: true,
      //TODO: Eliminate the globals below here. Could at least warn about them
      // in their respective files
      Studio: true,
      Maze: true,
      Turtle: true,
      Bounce: true,
      Eval: true,
      Flappy: true,
      Applab: true,
      Calc: true,
      Jigsaw: true
    }
  },
  all: [
    'Gruntfile.js',
    'tasks/**/*.js',
    'src/**/*.js*',
    'test/**/*.js',
    '!src/hammer.js',
    '!src/lodash.js',
    '!src/lodash.min.js',
    '!src/canvg/*.js',
    '!src/calc/js-numbers/js-numbers.js',
    '!src/ResizeSensor.js',
    '!src/applab/colpick.js'
  ]
};

config.strip_code = {
  options: {
    start_comment: 'start-test-block',
    end_comment: 'end-test-block'
  },
  all: {
    src: ['build/js/*.js']
  }
};

module.exports = function(grunt) {
  grunt.initConfig(config);

  // Autoload grunt tasks
  require('load-grunt-tasks')(grunt, {pattern: ['grunt-*', '!grunt-lib-contrib']});

  grunt.loadTasks('tasks');
  grunt.registerTask('noop', function () {});

  // Add md5 digest to filenames
  grunt.registerMultiTask('digest', function () {
    var crypto = require('crypto');
    var fs = require('fs');
    var manifest = {};
    this.filesSrc.forEach(function (file) {
      var data = grunt.file.read(file);
      var digest = crypto.createHash('md5').update(data).digest('hex');
      var oldName = path.relative('build/package/js', file);
      var newName = oldName.replace(/\.js$/, '-' + digest + '.js');
      fs.rename(file, file.replace(/\.js$/, '-' + digest + '.js'));
      manifest[oldName] = newName;
    });
    grunt.file.write(this.options().out, 'var digestManifest = ' + JSON.stringify(manifest));
  });

  // Generate locale stub files in the build/locale/current folder
  grunt.registerTask('locales', function() {
    var fs = require('fs');
    var mkdirp = require('mkdirp');
    var current = path.resolve('build/locale/current');
    mkdirp.sync(current);
    APPS.concat('common').map(function (item) {
      var localeString = '/*'+item+'*/ module.exports = window.blockly.' + (item == 'common' ? 'locale' : 'appLocale') + ';';
      fs.writeFileSync(path.join(current, item + '.js'), localeString);
    });
  });

  grunt.registerTask('prebuild', [
    'pseudoloc',
    'newer:messages',
    'newer:copy:src',
    'locales',
    'newer:strip_code',
    'ejs'
  ]);

  grunt.registerTask('postbuild', [
    'newer:copy:static',
    'newer:copy:lib',
    'newer:concat',
    'newer:sass',
    'digest'
  ]);

  grunt.registerTask('build', [
    'prebuild',
    'exec:browserify',
    // Skip minification in development environment.
    DEV ? 'noop' : ('concurrent:uglify'),
    'postbuild'
  ]);

  grunt.registerTask('rebuild', ['clean', 'build']);

  config.concurrent.watch = {
    tasks: ['exec:watchify', 'watch'],
    options: {
      logConcurrentOutput: true
    }
  };

  grunt.registerTask('dev', [
    'prebuild',
    'postbuild',
    'express:server',
    'concurrent:watch'
  ]);

  grunt.registerTask('mochaTest', ['exec:mochaTest']);

  grunt.registerTask('test', ['jshint', 'mochaTest']);

  grunt.registerTask('default', ['rebuild', 'test']);

  process.env.mocha_grep = grunt.option('grep') || '';
  process.env.mocha_debug = grunt.option('debug') || '';
  process.env.mocha_entry = grunt.option('entry') || '';
  process.env.mocha_invert = grunt.option('invert') || '';
};
