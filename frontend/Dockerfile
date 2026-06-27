FROM node:20-alpine AS build

WORKDIR /app

# CRA bakes env vars at build time -> pass as build args.
ARG REACT_APP_BACKEND_URL
ARG REACT_APP_CLERK_PUBLISHABLE_KEY
ARG REACT_APP_DEMO_AUTH=false
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL \
    REACT_APP_CLERK_PUBLISHABLE_KEY=$REACT_APP_CLERK_PUBLISHABLE_KEY \
    REACT_APP_DEMO_AUTH=$REACT_APP_DEMO_AUTH \
    CI=false

COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
