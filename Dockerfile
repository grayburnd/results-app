FROM node:22-slim

# add curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl=7.88.1-10+deb12u15 tini=0.19.0-1+b3 && \
    rm -rf /var/lib/apt/lists/*

# Set the application directory
WORKDIR /usr/local/app

##Create non-root user to run application from
RUN groupadd --system --gid 999 appgroup && \
    useradd --system --gid 999 --create-home --uid 999 appuser

COPY package*.json ./

RUN npm ci && \
 npm cache clean --force && \
 mv /usr/local/app/node_modules /node_modules

COPY . .

##Ensure appuser/group owns the apps working directory
RUN chown appuser:appgroup /usr/local/app -R

##Run app as appuser
USER 999

## ENV PORT 80 specify at runtime
EXPOSE 80

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
