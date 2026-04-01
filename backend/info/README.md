# Quantum Info Backend

Separate backend for high-speed cryptographic scanning.

## Features
- **TLS Scan**: SSLyze-based protocol and certificate analysis.
- **Port Scan**: Nmap-based infrastructure reconnaissance.
- **PQC Handshake**: liboqs-based quantum-safe readiness probing.

## Setup
1. Navigate to `backend/info`
2. Install dependencies:
   ```bash
   pip install fastapi uvicorn sslyze
   ```
3. Run the server:
   ```bash
   uvicorn app.main:app --port 8001 --reload
   ```

## API Endpoints
- `POST /api/v1/scan/tls`: TLS Inspection
- `POST /api/v1/scan/port`: Port Discovery
- `POST /api/v1/scan/pqc`: PQC Handshake Test
