from __future__ import annotations

import asyncio
import json
import shutil
from typing import Any

from app.core.config import get_settings

settings = get_settings()


def nmap_available() -> bool:
    return shutil.which("nmap") is not None


async def run_nmap_scan(host: str) -> dict[str, Any]:
    if not nmap_available():
        raise RuntimeError("nmap is not installed on this machine.")

    process = await asyncio.create_subprocess_exec(
        "nmap",
        "-Pn",
        "-sT",
        "-T4",
        f"--top-ports={settings.NMAP_TOP_PORTS}",
        "-oX",
        "-",
        host,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=settings.NMAP_TIMEOUT_SECONDS,
        )
    except TimeoutError as exc:
        process.kill()
        raise RuntimeError(f"nmap timed out after {settings.NMAP_TIMEOUT_SECONDS}s") from exc

    if process.returncode != 0:
        raise RuntimeError(stderr.decode().strip() or "nmap scan failed")

    from xml.etree import ElementTree as ET

    xml_root = ET.fromstring(stdout.decode())
    host_node = xml_root.find("host")
    if host_node is None:
        return {"open_ports": [], "status": "down", "raw_xml": stdout.decode()}

    ports_node = host_node.find("ports")
    open_ports: list[dict[str, Any]] = []
    if ports_node is not None:
        for port_node in ports_node.findall("port"):
            state = port_node.find("state")
            if state is None or state.attrib.get("state") != "open":
                continue
            service = port_node.find("service")
            open_ports.append(
                {
                    "port": int(port_node.attrib["portid"]),
                    "protocol": port_node.attrib.get("protocol", "tcp"),
                    "service": service.attrib.get("name", "unknown") if service is not None else "unknown",
                    "product": service.attrib.get("product") if service is not None else None,
                }
            )

    return {
        "status": host_node.find("status").attrib.get("state", "unknown") if host_node.find("status") is not None else "unknown",
        "open_ports": open_ports,
        "raw_xml": stdout.decode(),
    }


def risk_from_open_ports(open_ports: list[dict[str, Any]]) -> float:
    high_risk_ports = {21, 23, 25, 110, 143, 445, 3389, 5900}
    medium_risk_ports = {22, 53, 80, 139, 8080, 8443}
    score = 1.0

    for item in open_ports:
        port = int(item["port"])
        if port in high_risk_ports:
            score += 1.8
        elif port in medium_risk_ports:
            score += 0.9
        else:
            score += 0.35

    if 443 in {int(item["port"]) for item in open_ports}:
        score += 0.4

    return round(min(score, 9.8), 2)


def best_tls_guess(open_ports: list[dict[str, Any]]) -> str | None:
    ports = {int(item["port"]) for item in open_ports}
    if 443 in ports or 8443 in ports:
        return "TLS 1.3"
    if 80 in ports or 8080 in ports:
        return "TLS 1.2"
    return None


def primary_service(open_ports: list[dict[str, Any]]) -> str | None:
    if not open_ports:
        return None
    top = sorted(open_ports, key=lambda item: item["port"])[0]
    return top.get("service")


def summarize_ports(open_ports: list[dict[str, Any]]) -> str:
    if not open_ports:
        return "No open ports detected in the scanned range."
    return ", ".join(f"{item['port']}/{item['protocol']} ({item['service']})" for item in open_ports[:8])
