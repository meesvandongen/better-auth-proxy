FROM oven/bun:latest
WORKDIR /app
COPY . .
# Both ports may be used depending on the service command
EXPOSE 8080 3000
# Default to auth-proxy; compose overrides this for demo-app
CMD ["bun", "./src/index.ts"]