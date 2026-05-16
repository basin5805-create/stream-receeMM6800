#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from http.cookies import SimpleCookie

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "vendor"))

from xhshow.client import Xhshow


LIVE_ROOM_BASE = "https://live-room.xiaohongshu.com"
LIVE_PAGE_BASE = "https://www.xiaohongshu.com/livestream"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0"
)


def parse_cookie_string(cookie_string: str) -> dict[str, str]:
    cookie = SimpleCookie()
    cookie.load(cookie_string)
    return {key: morsel.value for key, morsel in cookie.items()}


def build_cookie_header(cookie_dict: dict[str, str]) -> str:
    return "; ".join(f"{key}={value}" for key, value in cookie_dict.items())


def build_base_headers(room_id: str, cookie_header: str) -> dict[str, str]:
    return {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.xiaohongshu.com",
        "Referer": f"{LIVE_PAGE_BASE}/{room_id}",
        "Cookie": cookie_header,
    }


def request_json(
    method: str,
    room_id: str,
    path: str,
    cookies: dict[str, str],
    params: dict | None = None,
    payload: dict | None = None,
) -> dict:
    client = Xhshow()
    cookie_header = build_cookie_header(cookies)
    headers = build_base_headers(room_id, cookie_header)
    if method == "GET":
        signed_headers = client.sign_headers_get(path, cookies, params=params)
        query = f"?{urllib.parse.urlencode(params or {})}" if params else ""
        url = f"{LIVE_ROOM_BASE}{path}{query}"
        request = urllib.request.Request(url, headers={**headers, **signed_headers}, method="GET")
    else:
        signed_headers = client.sign_headers_post(path, cookies, payload=payload)
        body = json.dumps(payload or {}, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        url = f"{LIVE_ROOM_BASE}{path}"
        request = urllib.request.Request(
            url,
            data=body,
            headers={**headers, "Content-Type": "application/json;charset=UTF-8", **signed_headers},
            method="POST",
        )

    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_streams(pull_config_raw) -> list[dict]:
    if not pull_config_raw:
        return []
    pull_config = json.loads(pull_config_raw) if isinstance(pull_config_raw, str) else pull_config_raw
    streams = []
    for item in pull_config.get("streams", []):
        master_url = item.get("master_url") or ""
        if not master_url:
            continue
        quality = item.get("quality_type_name") or item.get("quality_type") or "unknown"
        bitrate = int(item.get("max_bitrate") or 0)
        fmt = "hls" if master_url.endswith(".m3u8") else "flv"
        priority = 0 if fmt == "flv" else 1
        streams.append(
            {
                "url": master_url,
                "format": fmt,
                "quality": quality,
                "bitrate": bitrate,
                "priority": priority,
            }
        )
    streams.sort(key=lambda item: (item["priority"], -item["bitrate"], item["quality"]))
    return streams


def extract_result(room_payload: dict) -> dict:
    data = room_payload.get("data") or {}
    room_info = data.get("roomInfo") or {}
    host_info = data.get("hostInfo") or {}
    live = room_info.get("status") == 0
    return {
        "ok": True,
        "live": live,
        "title": room_info.get("roomTitle") or room_info.get("name") or "",
        "artist": host_info.get("nickName") or host_info.get("nickname") or "",
        "coverUrl": room_info.get("roomCover") or room_info.get("cover") or "",
        "artistImageUrl": host_info.get("avatar") or "",
        "streams": normalize_streams(room_info.get("pullConfig")),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--room-id", required=True)
    parser.add_argument("--cookies", required=True)
    args = parser.parse_args()

    cookies = parse_cookie_string(args.cookies)
    if not cookies.get("a1"):
        print(json.dumps({"ok": False, "error": "missing a1 cookie"}, ensure_ascii=False))
        return 1

    join_payload = {
        "roomId": args.room_id,
        "source": "web_live",
        "preSource": "pc_web",
        "clientType": 1,
        "appId": 1,
        "viewSessionId": f"{args.room_id}-{int(time.time() * 1000)}",
    }

    try:
        join_response = request_json(
            "POST",
            args.room_id,
            "/api/sns/red/live/web/v1/center/room/join/room",
            cookies,
            payload=join_payload,
        )
        if join_response.get("code") == 0 and (join_response.get("data") or {}).get("roomInfo"):
            print(json.dumps(extract_result(join_response), ensure_ascii=False))
            return 0

        print(
            json.dumps(
                {
                    "ok": False,
                    "error": join_response.get("msg") or "join room failed",
                    "code": join_response.get("code"),
                    "response": join_response,
                },
                ensure_ascii=False,
            )
        )
        return 1
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
