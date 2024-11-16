FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install depdenencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy fastapi code
COPY . .

# Expose backend port
EXPOSE 8000

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]