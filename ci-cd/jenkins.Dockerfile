# Jenkins LTS with k6 preinstalled — the image behind the compose
# `jenkins` service (started with `make jenkins`).
#
# k6 inside Jenkins mirrors the CI reality: the agent runs `k6 run` and
# the exit code gates the build (see ci-cd/README.md). The k6 CLI for
# your own local runs stays a host dependency — this image only equips
# Jenkins.
#
# Also includes the Docker CLI so pipeline stages can spawn containers
# (Jenkinsfile.docker) through the host socket mounted in compose.yaml.
FROM jenkins/jenkins:lts

ARG TARGETARCH

USER root

# Docker CLI only (no daemon) — the daemon is the host's, via socket mount.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli \
    && curl -fsSL "https://github.com/grafana/k6/releases/download/v2.4.0/k6-v2.4.0-linux-${TARGETARCH}.tar.gz" \
        -o /tmp/k6.tgz \
    && tar -xzf /tmp/k6.tgz -C /tmp \
    && install -m 0755 "/tmp/k6-v2.4.0-linux-${TARGETARCH}/k6" /usr/local/bin/k6 \
    && rm -rf /var/lib/apt/lists/* /tmp/k6.tgz "/tmp/k6-v2.4.0-linux-${TARGETARCH}" \
    && k6 version \
    && docker --version

USER jenkins
