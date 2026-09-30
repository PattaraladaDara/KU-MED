FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Asia/Bangkok

FROM base AS dependencies
COPY package.json package-lock.json ./
# The lockfile is maintained on Windows, while this image runs Linux.
# npm install resolves platform-specific optional packages that npm ci rejects
# when they are absent from a Windows-generated lockfile.
RUN npm install --include=optional --no-audit --no-fund

FROM dependencies AS migration
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["npm", "run", "db:deploy"]

FROM dependencies AS builder
ARG NEXT_PUBLIC_PROMPTPAY_ID
ARG NEXT_PUBLIC_DEMO_DOCTOR_NAME
ARG NEXT_PUBLIC_DEMO_MEDICAL_LICENSE
ARG KUMED_BUILD_ID=dev
ENV NEXT_PUBLIC_PROMPTPAY_ID=$NEXT_PUBLIC_PROMPTPAY_ID
ENV NEXT_PUBLIC_DEMO_DOCTOR_NAME=$NEXT_PUBLIC_DEMO_DOCTOR_NAME
ENV NEXT_PUBLIC_DEMO_MEDICAL_LICENSE=$NEXT_PUBLIC_DEMO_MEDICAL_LICENSE
ENV KUMED_BUILD_ID=$KUMED_BUILD_ID
COPY . .
RUN npm run build && node scripts/verify-payment-build.mjs

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts/verify-payment-build.mjs ./scripts/verify-payment-build.mjs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
