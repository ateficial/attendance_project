FROM alpine:3.20

RUN apk add --no-cache ca-certificates curl unzip

WORKDIR /app

ARG PB_VERSION=0.25.9
RUN curl -fsSL -o /tmp/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && unzip /tmp/pocketbase.zip -d /app \
    && rm /tmp/pocketbase.zip \
    && chmod +x /app/pocketbase

COPY pb_hooks /app/pb_hooks
COPY pb_migrations /app/pb_migrations
COPY pb_schema.json /app/pb_schema.json

EXPOSE 8090

# Uses ephemeral filesystem by default. Mount a Fly volume to /pb_data for persistence.
CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--hooksDir=/app/pb_hooks", "--migrationsDir=/app/pb_migrations"]
