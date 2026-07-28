FROM debian:bookworm-slim AS builder

ARG BACKREST_VERSION="2.59.0"

RUN apt-get update && apt-get install -y \
    make \
    gcc \
    libpq-dev \
    libssl-dev \
    libxml2-dev \
    pkg-config \
    liblz4-dev \
    libzstd-dev \
    libbz2-dev \
    libz-dev \
    libyaml-dev \
    wget \
    tar

RUN wget -qO- https://github.com/pgbackrest/pgbackrest/archive/release/${BACKREST_VERSION}.tar.gz | tar zx -C /tmp \
    && cd /tmp/pgbackrest-release-${BACKREST_VERSION}/src \
    && ./configure \
    && make \
    && make install

FROM postgres:18

# Copy the compiled binary from the builder stage
COPY --from=builder /usr/bin/pgbackrest /usr/bin/pgbackrest

# Install runtime dependencies for pgbackrest
RUN apt-get update -y \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y \
        libxml2 \
        liblz4-1 \
        libzstd1 \
        libbz2-1.0 \
        libyaml-0-2 \
    && apt-get autoremove -y \
    && apt-get autopurge -y \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint-wrapper.sh /usr/local/bin/entrypoint-wrapper.sh
RUN chmod +x /usr/local/bin/entrypoint-wrapper.sh

ENTRYPOINT ["entrypoint-wrapper.sh"]
CMD ["postgres"]
