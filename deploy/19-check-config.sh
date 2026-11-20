#!/bin/sh
set -eu
# This is inserted into an nginx directive. Accept an origin, never config text.
case "${MUSIC_SERVER_URL:-}" in
    *[!a-zA-Z0-9.:/_-]*) echo >&2 'Invalid characters in MUSIC_SERVER_URL'; exit 1 ;;
esac
if ! printf '%s\n' "${MUSIC_SERVER_URL:-}" | grep -Eq '^https?://[A-Za-z0-9._-]+(:[0-9]{1,5})?$'; then
    echo >&2 'Set MUSIC_SERVER_URL to http(s)://hostname[:port], without a path or trailing slash.'
    exit 1
fi
