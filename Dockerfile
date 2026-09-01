FROM node:22-slim

# add curl for healthcheck
RUN apt update && \
    apt install -y --no-install-recommends curl tini && \
    rm -rf /var/lib/apt/lists/*

# Set the application directory
WORKDIR /usr/local/app

##Create non-root user to run application from
RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --no-create-home appuser

COPY package*.json ./

RUN npm ci && \
 npm cache clean --force && \
 mv /usr/local/app/node_modules /node_modules

COPY . .

##Ensure appuser/group owns the apps working directory
RUN chown appuser:appgroup /usr/local/app -R

##Run app as appuser
USER appuser

## ENV PORT 80 specify at runtime
EXPOSE 80

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
