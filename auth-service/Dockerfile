FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for production)
RUN npm install

# Copy source code
COPY . .

# Copy environment file
RUN cp env.example .env

EXPOSE 3001

CMD ["npm", "start"] 