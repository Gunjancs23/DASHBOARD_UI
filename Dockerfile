# Use Node.js as the base image
FROM node:24

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Apply migrations, then start the Next.js application
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
