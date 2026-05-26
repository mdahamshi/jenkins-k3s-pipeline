FROM node:20-alpine
WORKDIR /app
COPY package.json .
COPY app.js .
LABEL org.opencontainers.image.source=https://github.com/mdahamshi/jenkins-k3s-pipeline
EXPOSE 3000
CMD ["node", "app.js"]
