FROM postgres:18

ENV BACKREST_USER="postgres" \
    BACKREST_GROUP="postgres" \
    PG_VERSION="18"

RUN apt-get update -y \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y \
        pgbackrest \
    && apt-get autoremove -y \
    && apt-get autopurge -y \
    && rm -rf /var/lib/apt/lists/*

# pgBackRest config
COPY --chmod=640 --chown=${BACKREST_USER}:${BACKREST_GROUP} ./conf/pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
