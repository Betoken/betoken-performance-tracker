#!/bin/sh
coffee -c .
browserify ./performance.js -o ./performance-bundle.js -t [ babelify --presets [ @babel/preset-env ] --plugins [ @babel/plugin-transform-runtime ] ]
cp ./performance-bundle.js ../Betoken.github.io/js
cp ./init.js ../Betoken.github.io/js