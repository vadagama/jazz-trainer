#!/bin/sh
set -e

# Railway Volume mount replaces the Dockerfile-created /app/data directory
# with an empty root-owned directory. Fix ownership so the 'node' user
# can create and write the SQLite database file.
mkdir -p /app/data
chown node:node /app/data

# Drop privileges and start the application
exec su-exec node node apps/api/dist/index.js
