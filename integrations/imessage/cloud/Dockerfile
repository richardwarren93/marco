FROM node:24-bookworm-slim
WORKDIR /app/integrations/imessage/cloud
COPY integrations/imessage/cloud/package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY integrations/imessage/cloud/index.ts ./index.ts
COPY integrations/imessage/bridge.ts ../bridge.ts
COPY src/lib/imessage/protocol.ts /app/src/lib/imessage/protocol.ts
ENV NODE_ENV=production
USER node
CMD ["node", "index.ts"]
