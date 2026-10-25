# Install dependencies with pnpm, pinned through the packageManager field in
# package.json. pnpm 12 needs a newer corepack than the one bundled with Node.
FROM node:24-slim AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@latest && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY demo/package.json ./demo/
RUN pnpm install --frozen-lockfile --prod --filter better-auth-proxy

# The auth proxy runs on Bun (Bun.serve with HTML imports).
FROM oven/bun:latest
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 8080
CMD ["bun", "./src/index.ts"]
