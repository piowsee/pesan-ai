#!/usr/bin/env bash
set -e

# Ensure certificates have the right permissions for pgbackrest
if [ -d "/etc/pgbackrest/cert" ]; then
    chown -R postgres:postgres /etc/pgbackrest/cert
    chmod 600 /etc/pgbackrest/cert/* || true
fi

# Hand over to the original postgres entrypoint
exec docker-entrypoint.sh "$@"
