#!/usr/bin/env bash

set -e

printf "\nUpdating 'medium-zoom' dependency in examples...\n"

node ./scripts/update-examples

git add examples
git commit -m "chore(examples): update medium-zoom dependency"
git push origin master
