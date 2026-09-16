FROM node:22-alpine
RUN apk add --no-cache bash git github-cli python3
WORKDIR /app
COPY web/package.json ./web/package.json
COPY project.json anamnesis.json ./
COPY scripts ./scripts
COPY web ./web
RUN chmod +x /app/scripts/publish-github.sh
WORKDIR /app/web
ENV NODE_ENV=production
ENV PORT=3300
ENV HOST=0.0.0.0
EXPOSE 3300
CMD ["node", "server.js"]
