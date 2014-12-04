#!/bin/bash
path="/var/local/node/serial.host/"
mkdir -p $path
rsync -a --delete --verbose --progress serial.host.js $path

