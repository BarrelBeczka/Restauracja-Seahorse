FROM node:20-slim

WORKDIR /app

# Kopiowanie plików package.json i instalacja zależności
COPY package*.json ./
RUN npm install

# Kopiowanie reszty kodu React
COPY . .

# Wyeksponowanie portu serwera deweloperskiego Vite
EXPOSE 5173

# Uruchomienie serwera deweloperskiego w trybie hosta (--host)
CMD ["npm", "run", "dev", "--", "--host"]
