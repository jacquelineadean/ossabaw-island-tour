#!/bin/bash
# Builds the claude.ai artifact: one HTML file with all code and styles inlined,
# plus the art folder it loads paintings from.
#   bundle.html             the page as one complete HTML document
#   artifact/index.html     the same document next to artifact/ossabaw-art/; opens in a browser
#   artifact/publish.html   the page without doctype/html/head/body, for the claude.ai Artifact tool
set -e
cd "$(dirname "$0")/.."

rm -rf dist .parcel-cache bundle.html artifact
npx parcel build index.html --dist-dir dist --no-source-maps --public-url ./
mkdir -p artifact
node scripts/inline.mjs dist/index.html bundle.html artifact/publish.html
cp bundle.html artifact/index.html
cp -R public/ossabaw-art artifact/ossabaw-art
echo "bundle.html: $(du -h bundle.html | cut -f1)  artifact/: $(du -sh artifact | cut -f1)"
