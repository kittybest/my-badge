#!/bin/sh

mkdir build 2> /dev/null || true

rm -rf ./keys
rm -rf ./build/keys

cp -r ../../node_modules/@unirep/circuits/zksnarkBuild/. ./keys
cp -r ../../node_modules/@unirep/circuits/zksnarkBuild/. ./build/keys
cp -r ../circuits/zksnarkBuild/. ./keys
cp -r ../circuits/zksnarkBuild/. ./build/keys
