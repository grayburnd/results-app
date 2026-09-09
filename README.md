## Results App

The results app is a Node.js and Express service that reads aggregated votes from PostgreSQL and serves the results interface. It listens on port `80` by default, serves the web interface at `/` and exposes JSON results at `/results`. Socket.IO broadcasts updated totals to connected clients.

The service reads `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB` and `DB_SSL_MODE` from the environment. `PORT` changes the listening port and `BASE_PATH` sets the path prefix used when the service is published behind a gateway. The default base path is `/`.

## Local Development

Install the Node.js dependencies with:

```bash
npm ci
```

Run the service locally with the direct Node.js command because the repository does not currently define a `start` script:

```bash
PORT=8080 node server.js
```

The application needs a reachable PostgreSQL database with the required environment variables before it can display results. The current `npm test` script is a placeholder that exits with status `1`; do not treat it as passing automated test coverage.

## Container

The Dockerfile uses Node.js 22, installs the locked npm dependencies with `npm ci` and runs the service as non-root UID/GID `999`:

```bash
docker build -t voting-results .
docker run --rm -p 8080:80 \
	-e DB_HOST=${DB_HOST:-host.docker.internal} \
	-e DB_PORT=5432 \
	-e DB_USERNAME=${DB_USERNAME} \
	-e DB_PASSWORD=${DB_PASSWORD} \
	-e DB=${DB_NAME} \
	voting-results
```

## Delivery

The CI workflows build an Amazon ECR image tagged with the source commit SHA:

```text
<account>.dkr.ecr.<region>.amazonaws.com/voting-results:<git-sha>
```

After a merge to `main`, the CD workflow runs Updatecli and updates `apps/voting-results/prod-values.yml` in the [`frontend-gitops`](https://github.com/YOUR_GITHUB_ORG/frontend-gitops) repository. See the [platform application guide](https://github.com/YOUR_GITHUB_ORG/aws-eks-gitops-argocd-terraform/blob/main/App/README.md) for the wider application workflow and the [frontend GitOps repository](https://github.com/YOUR_GITHUB_ORG/frontend-gitops) for the Kubernetes deployment configuration.
