FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# emergentintegrations ships on a private index.
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
