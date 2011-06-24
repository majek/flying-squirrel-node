#!/bin/sh
while [ 1 ]; do
    echo " [*] Running node"
    node server.js &
    NODEPID=$!

    echo " [*] node pid= $NODEPID"
    inotifywait -r -q -e modify .
    kill $NODEPID
    sleep 0.1
done
