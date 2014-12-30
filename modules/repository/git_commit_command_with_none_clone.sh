#!/bin/bash
# $1 = clone repository
# $2 = modified file path with name
# $3 = modified file path with name
# $4 = message
cd $1;
git fetch
git pull
mv $3 $2;
git add $2;
git commit $2 -m "'$4'";
git push origin master;