#!/bin/zsh
# Downloads the newest successfully built APK from GitHub Actions into dist/.
# usage: dev/get-apk.sh [branch]   (default: the current branch)
cd "$(dirname "$0")/.."
BRANCH=${1:-$(git branch --show-current)}
RUN=$(gh run list --workflow "Android app" --branch "$BRANCH" --status success --limit 1 --json databaseId --jq '.[0].databaseId')
[ -z "$RUN" ] && { echo "no successful Android build on branch $BRANCH"; exit 1; }
rm -rf dist/.tmp && mkdir -p dist/.tmp
gh run download "$RUN" --name nekamat-apk --dir dist/.tmp && mv dist/.tmp/nekamat-hacheshbonaim.apk dist/ && rm -rf dist/.tmp
ls -la dist/nekamat-hacheshbonaim.apk
