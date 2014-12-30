#!/bin/bash
# $1 = bare repository
# $2 = clone repository this should be seperate for every user and project
# might be reponame_username because of config. same repository has many contributors.
# $3 = username
# $4 = useremail
# $5 = temp file path with name
# $6 = modified file path with name
# $7 = message
git clone -l -s -n  $1 $2;
cd $2;
git config user.name $3;
git config user.email $4;
mv $6 $5;
git add $5;
git commit $5 -m "'$7'";
git push origin master;