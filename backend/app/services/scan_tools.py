from __future__ import annotations

import asyncio
import json
import shutil
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

import requests

from app.core.config import get_settings

settings = get_settings()


def normalize_scan_target(asset_value: str) -> str:
    parsed = urlparse(asset_value)
    if parsed.hostname:
        return parsed.hostname
    return asset_value.split("/")[0].strip()


async def _run_command(*args: str, timeout: int) -> tuple[int, str, str]:
    process = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
    except TimeoutError as exc:
        process.kill()
        raise RuntimeError(f"Command timed out: {' '.join(args)}") from exc
    return process.returncode, stdout.decode(), stderr.decode()


def _parse_nmap_xml(xml_payload: str) -> dict[str, Any]:
    root = ET.fromstring(xml_payload)
    host_node = root.find("host")
    open_ports: list[dict[str, Any]] = []
    if host_node is not None:
        for port_node in host_node.findall("./ports/port"):
            state = port_node.find("state")
            if state is None or state.attrib.get("state") != "open":
                continue
            service = port_node.find("service")
            open_ports.append(
                {
                    "port": int(port_node.attrib.get("portid", "0")),
                    "protocol": port_node.attrib.get("protocol", "tcp"),
                    "service": service.attrib.get("name", "unknown") if service is not None else "unknown",
                    "product": service.attrib.get("product") if service is not None else None,
                }
            )
    return {
        "open_ports": open_ports,
        "services": [item.get("service") for item in open_ports if item.get("service")],
        "raw_xml": xml_payload,
    }


async def run_nmap_scan(target: str) -> dict[str, Any]:
    if shutil.which("nmap") is None:
        return {
            "tool": "nmap",
            "available": False,
            "open_ports": [],
            "services": [],
            "raw_xml": None,
            "error": "nmap is not installed",
        }

    code, stdout, stderr = await _run_command(
        "nmap",
        "-p",
        "443,80",
        "--open",
        "-oX",
        "-",
        target,
        timeout=settings.NMAP_TIMEOUT_SECONDS,
    )
    if code != 0:
        raise RuntimeError(stderr.strip() or "nmap scan failed")

    parsed = _parse_nmap_xml(stdout)
    return {"tool": "nmap", "available": True, **parsed}


def _walk_json(value: Any) -> list[Any]:
    stack = [value]
    found: list[Any] = []
    while stack:
        current = stack.pop()
        found.append(current)
        if isinstance(current, dict):
            stack.extend(current.values())
        elif isinstance(current, list):
            stack.extend(current)
    return found


def _first_non_empty(*values: Any) -> Any:
    for value in values:
        if value not in (None, "", [], {}):
            return value
    return None


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(normalized)
            return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            return None
    return None


def _parse_sslyze_payload(payload: dict[str, Any]) -> dict[str, Any]:
    tls_versions: list[str] = []
    ciphers: list[str] = []
    certificate_issuer: str | None = None
    certificate_expiry: datetime | None = None
    key_exchange: str | None = None
    vulnerabilities: list[dict[str, Any]] = []

    for node in _walk_json(payload):
        if isinstance(node, dict):
            version_value = _first_non_empty(
                node.get("tls_version"),
                node.get("version"),
                node.get("protocol_version"),
            )
            if isinstance(version_value, str) and "tls" in version_value.lower():
                tls_versions.append(version_value)

            cipher_value = _first_non_empty(
                node.get("cipher_suite"),
                node.get("cipher"),
                node.get("accepted_cipher_suite"),
                node.get("name") if "TLS_" in str(node.get("name", "")) else None,
            )
            if isinstance(cipher_value, str) and cipher_value not in ciphers:
                ciphers.append(cipher_value)

            issuer = _first_non_empty(
                node.get("issuer"),
                node.get("certificate_issuer"),
                node.get("issuer_name"),
            )
            if isinstance(issuer, str) and not certificate_issuer:
                certificate_issuer = issuer

            expiry = _parse_datetime(
                _first_non_empty(node.get("not_valid_after"), node.get("certificate_expiry"), node.get("not_after"))
            )
            if expiry and not certificate_expiry:
                certificate_expiry = expiry

            kx = _first_non_empty(
                node.get("key_exchange"),
                node.get("key_exchange_algorithm"),
                node.get("kx"),
                node.get("group_name"),
            )
            if isinstance(kx, str) and not key_exchange:
                key_exchange = kx

            if node.get("severity") or node.get("cve") or node.get("vulnerability"):
                vulnerabilities.append(node)

    tls_version = sorted(set(tls_versions))[-1] if tls_versions else None
    cipher = ciphers[0] if ciphers else None
    return {
        "tls_version": tls_version,
        "cipher": cipher,
        "cipher_suites": ciphers,
        "key_exchange": key_exchange,
        "certificate_issuer": certificate_issuer,
        "certificate_expiry": certificate_expiry,
        "vulnerabilities": vulnerabilities,
        "raw_data": payload,
    }


async def run_sslyze_scan(target: str) -> dict[str, Any]:
    if shutil.which("sslyze") is None:
        return {
            "tool": "sslyze",
            "available": False,
            "tls_version": None,
            "cipher": None,
            "cipher_suites": [],
            "key_exchange": None,
            "certificate_issuer": None,
            "certificate_expiry": None,
            "vulnerabilities": [],
            "raw_data": {"error": "sslyze is not installed"},
        }

    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = Path(tmpdir) / "result.json"
        code, _, stderr = await _run_command(
            "sslyze",
            "--json_out",
            str(output_path),
            target,
            timeout=settings.SCAN_TIMEOUT_SECONDS,
        )
        if code != 0:
            raise RuntimeError(stderr.strip() or "sslyze scan failed")
        payload = json.loads(output_path.read_text())
        parsed = _parse_sslyze_payload(payload)
        return {"tool": "sslyze", "available": True, **parsed}


def _requests_scan(url: str) -> dict[str, Any]:
    response = requests.get(url, timeout=10, allow_redirects=True)
    headers = dict(response.headers)
    return {
        "headers": headers,
        "status_code": response.status_code,
        "server": headers.get("server"),
        "security_headers": {
            "strict_transport_security": headers.get("strict-transport-security"),
            "content_security_policy": headers.get("content-security-policy"),
            "x_frame_options": headers.get("x-frame-options"),
            "x_content_type_options": headers.get("x-content-type-options"),
        },
    }


async def run_http_scan(target: str) -> dict[str, Any]:
    url = target if target.startswith(("http://", "https://")) else f"https://{target}"
    try:
        result = await asyncio.to_thread(_requests_scan, url)
        return {"tool": "requests", "available": True, **result}
    except Exception as exc:
        return {
            "tool": "requests",
            "available": False,
            "headers": {},
            "status_code": None,
            "server": None,
            "security_headers": {},
            "error": str(exc),
        }
