# Database Deployment and pgBackRest Guide

This directory contains the Docker configuration to deploy the PostgreSQL database and the pgBackRest backup software.

## pgBackRest Initialization

**CAUTION:** You must initialize the pgBackRest stanza on the S3 bucket manually. You only do this one time for a new S3 bucket or stanza. If you make the container again, you do not do this again.

Do this procedure after you start the database for the first time:

1. Go to your VPS terminal.
2. Type this command to initialize the stanza:
   ```bash
   docker exec -u postgres postgres pgbackrest --stanza=YOUR_STANZA stanza-create
   ```
3. Type this command to make sure that the configuration is correct:
   ```bash
   docker exec -u postgres postgres pgbackrest --stanza=YOUR_STANZA check
   ```

## Disaster Recovery

Do this procedure if the disk breaks, the volume is deleted, or the database is corrupted. This procedure restores your data from the S3 backups.

1. Stop the database container if it is on:
   ```bash
   docker compose stop postgres
   ```

2. Start a temporary container to download and restore the files from S3:
   ```bash
   docker compose run --rm -u postgres postgres pgbackrest --stanza=YOUR_STANZA restore
   ```

3. Start the database container:
   ```bash
   docker compose up -d postgres
   ```
   Note: The database automatically recovers the remaining data from the restored files during startup.
