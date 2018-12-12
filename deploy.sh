#!/bin/sh
coffee -c .
browserify ./performance.js -o ./performance-bundle.js
cp ./performance-bundle.js ../Betoken.github.io/js
cp ./init.js ../Betoken.github.io/js