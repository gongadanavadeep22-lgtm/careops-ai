# CareOps is a monorepo. Railway often clones the repo root, which has no package.json.
# This Dockerfile is the build definition when Root Directory is unset.
# If Settings → Source → Root Directory = `backend`, Railway ignores this file
# and builds from backend/package.json instead (also valid).
FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ ./

ENV NODE_ENV=production

CMD ["node", "index.js"]
