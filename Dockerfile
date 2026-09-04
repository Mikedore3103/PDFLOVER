FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ghostscript qpdf poppler-utils libreoffice \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY file-tools-app/package.json file-tools-app/package-lock.json ./file-tools-app/
RUN npm --prefix file-tools-app ci --omit=dev

COPY . .
WORKDIR /app/file-tools-app
ENV NODE_ENV=production
CMD ["npm", "start"]
