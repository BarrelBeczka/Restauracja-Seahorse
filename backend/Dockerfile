FROM python:3.12-slim

WORKDIR /app

# Kopiowanie i instalacja bibliotek (pip)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiowanie reszty kodu backendu
COPY . .

# Wyeksponowanie portu serwera Flask
EXPOSE 5000

# Uruchomienie aplikacji
CMD ["python", "app.py"]
