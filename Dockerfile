FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN node -e "const fs = require('node:fs'); for (const path of ['apps/api/package.json', 'packages/shared/package.json']) { const pkg = JSON.parse(fs.readFileSync(path)); delete pkg.devDependencies; fs.writeFileSync(path, JSON.stringify(pkg)); }" \
    && npm ci --omit=dev --omit=peer --workspace=@pdv/api --workspace=@pdv/shared \
    && npm cache clean --force

COPY tsconfig.base.json ./
COPY --chown=node:node apps/api ./apps/api
COPY --chown=node:node packages/shared ./packages/shared

ENV NODE_ENV=production
ENV PORT=3333
WORKDIR /app/apps/api
USER node
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/saude').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"

CMD ["node", "--import", "tsx", "src/index.ts"]
