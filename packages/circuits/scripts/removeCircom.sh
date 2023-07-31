#!/bin/sh

cp ./zksnarkBuild/powersOfTau28_hez_final_18.ptau .
rm -r ./zksnarkBuild/*
cp ./powersOfTau28_hez_final_18.ptau ./zksnarkBuild
rm ./powersOfTau28_hez_final_18.ptau