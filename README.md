## Results App

The results app is a Node.js and Express service that reads aggregated votes from PostgreSQL and serves the results interface. It listens on port `80` by default, serves the web interface at `/` and exposes JSON results at `/results`. Socket.IO broadcasts updated totals to connected clients.

The service reads `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB` and `DB_SSL_MODE` from the environment. `PORT` changes the listening port and `BASE_PATH` sets the path prefix used when the service is published behind a gateway. The default base path is `/`.

## What's Included

- A Node.js/Express service that reads vote totals from PostgreSQL.
- A browser results view that displays the split between cats and dogs and refreshes as results change.
- A JSON `GET /results` endpoint for the current totals.
- Socket.IO support for broadcasting updated scores to connected clients.
- A production-oriented Docker image that runs as a non-root user.
- An Updatecli configuration for proposing image-tag changes in the GitOps repository.

This repository contains the results component only. Vote submission, database provisioning, Kubernetes manifests and the wider AWS EKS platform are maintained elsewhere. The wider platform project documents the surrounding application and delivery workflow in its [application guide](https://github.com/grayburnd/aws-eks-gitops-argocd-terraform/blob/main/App/README.md).

## Design Decisions

- **Read-only results service:** keeping vote submission separate limits this service to querying and presenting results.
- **PostgreSQL as the source of truth:** totals are queried directly from the `votes` table, so the display does not introduce a second data store or cache that could become stale.
- **Near-real-time updates:** the server refreshes totals every second and broadcasts them over Socket.IO; the page also loads an initial snapshot and refreshes through `/results`.
- **Path-prefix support:** `BASE_PATH` allows the same application to run at `/` locally or behind a gateway path such as `/result/`.
- **Container defaults:** the image uses a pinned Node.js base image, includes `tini` for process handling, and runs the application as UID/GID `999`.

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

The `tests/` directory contains a stack-level integration harness rather than a standalone test suite for this repository. It is intentionally kept with the wider demonstration platform, where the vote and results services can be exercised together.

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

After a merge to `main`, the CD workflow runs Updatecli and updates `apps/voting-results/prod-values.yml` in the [`frontend-gitops`](https://github.com/grayburnd/frontend-gitops) repository. See the [platform application guide](https://github.com/grayburnd/aws-eks-gitops-argocd-terraform/blob/main/App/README.md) for the wider application workflow and the [frontend GitOps repository](https://github.com/grayburnd/frontend-gitops) for the Kubernetes deployment configuration.

## Help and Contributions

For deployment, infrastructure or GitOps questions, use the wider platform documentation. For changes to this service, open a pull request with a concise description of the behavior being changed and verify the local or container startup path where practical. Keep application changes focused here; platform changes belong in the relevant infrastructure or GitOps repository.

This app is maintained as part of the wider AWS EKS GitOps demonstration project. There is no separate maintainer roster or contribution guide in this repository; repository issues and pull requests are the primary support and review path.
