from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import scanner_service

router = APIRouter(tags=["scans"])

class ScanRequest(BaseModel):
    target: str

@router.post("/scan/tls")
async def scan_tls(request: ScanRequest):
    try:
        return await scanner_service.tls_scan(request.target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan/port")
async def scan_port(request: ScanRequest):
    try:
        return await scanner_service.port_scan(request.target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan/pqc")
async def scan_pqc(request: ScanRequest):
    try:
        return await scanner_service.pqc_handshake(request.target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan/combined")
async def scan_combined(request: ScanRequest):
    try:
        return await scanner_service.combined_scan(request.target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
