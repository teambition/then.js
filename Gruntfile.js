/* jshint node: true */

module.exports = function(grunt) {
  'use strict';

  // Project configuration.
  grunt.initConfig({

    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/**\n' +
            ' * <%= pkg.name %>: v<%= pkg.version %>\n' +
            ' * <%= pkg.homepage %>\n' +
            ' */\n',
    // Task configuration.
    clean: ["then.min.js"],

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      then: {
        src: 'then.js'
      },
      Gruntfile: {
        src: 'Gruntfile.js'
      },
      testjs: {
        src: 'test/*.js'
      }
    },

    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      thenjs: {
        dest: 'then.min.js',
        src: 'then.js'
      }
    },

    nodeunit: {
      all: ['test/nodeunit_test.js']
    }

  });


  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Default task.
  grunt.registerTask('default', ['jshint', 'nodeunit', 'clean', 'uglify']);
  grunt.registerTask('test', ['jshint', 'nodeunit']);
  grunt.registerTask('build', ['jshint', 'clean', 'uglify']);
};