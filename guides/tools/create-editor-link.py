#!/usr/bin/env python3
"""UTF-8 Markdown 파일을 보내 tools.camp 편집 URL을 출력한다."""

import argparse
from http.client import HTTPException
import json
from pathlib import Path
import ssl
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


API_BASE = "https://ogmqkh3edxrhn5as6ohnde2o7a0euirv.lambda-url.ap-northeast-2.on.aws"
MAX_BYTES = 64 * 1024
REQUEST_TIMEOUT = 30


def create_editor_link(markdown_file, api_base=API_BASE):
    """원문을 한 번 전송하고 201 응답의 편집 URL을 반환한다."""
    raw = Path(markdown_file).read_bytes()
    if len(raw) > MAX_BYTES:
        raise ValueError(f"Markdown은 UTF-8 기준 64 KiB까지 지원합니다. 현재 {len(raw)}바이트입니다.")
    markdown = raw.decode("utf-8")
    if not markdown.strip():
        raise ValueError("Markdown 파일이 비어 있습니다.")

    payload = json.dumps({"markdown": markdown}, ensure_ascii=False).encode("utf-8")
    request = Request(
        api_base.rstrip("/") + "/api/v1/mdedit",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    context = ssl.create_default_context()
    system_ca = Path("/etc/ssl/cert.pem")
    if sys.platform == "darwin" and system_ca.exists():
        context.load_verify_locations(cafile=str(system_ca))
    with urlopen(request, timeout=REQUEST_TIMEOUT, context=context) as response:
        if response.status != 201:
            raise ValueError(f"API 성공 응답은 201이어야 합니다. 받은 상태: {response.status}")
        result = json.load(response)

    if not isinstance(result, dict):
        raise ValueError("API 응답은 JSON 객체여야 합니다.")
    url = result.get("url")
    if not isinstance(url, str) or any(
        character.isspace() or ord(character) < 32 or ord(character) == 127 for character in url
    ):
        raise ValueError("API 응답에 유효한 편집 URL이 없습니다.")
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc != "tools.camp" or not parsed.path.strip("/"):
        raise ValueError("API가 올바른 tools.camp 편집 URL을 반환하지 않았습니다.")
    return url


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown_file", type=Path, help="다이어그램 코드 펜스를 포함한 Markdown 파일")
    parser.add_argument("--api-base", default=API_BASE, help="검증 서버용 API base URL")
    args = parser.parse_args(argv)
    try:
        url = create_editor_link(args.markdown_file, args.api_base)
    except HTTPError as error:
        print(f"편집 링크 생성 실패: API 오류 ({error.code}): {error.reason}", file=sys.stderr)
        return 1
    except (OSError, ValueError, URLError, HTTPException) as error:
        print(f"편집 링크 생성 실패: {error}", file=sys.stderr)
        return 1
    print(url)
    return 0


if __name__ == "__main__":
    sys.exit(main())
