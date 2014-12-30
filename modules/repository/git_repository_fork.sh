#!/bin/bash
# repository fork A to B
# $1 = A bare repository path
# $2 = B bare repository path
git clone -l -s --bare $1 $2;
