#!/usr/bin/env python3
"""편집 링크 생성 도구의 전송 계약과 실패 처리를 검증한다."""

from contextlib import contextmanager, redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import threading
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("create-editor-link.py")
sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("create_editor_link", SCRIPT)
CLIENT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CLIENT)


@contextmanager
def api_server(status=201, body=None):
    if body is None:
        body = {"url": "https://tools.camp/example", "editorUrl": "https://tools.camp/mdedit#script=example"}
    response = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
    requests = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            raw = self.rfile.read(int(self.headers["Content-Length"]))
            requests.append({"path": self.path, "headers": self.headers, "body": raw})
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}", requests
    finally:
        server.shutdown()
        thread.join()
        server.server_close()


class EditorLinkTests(unittest.TestCase):
    def run_client(self, raw, api_base):
        with TemporaryDirectory(prefix="diagram-link-") as directory:
            markdown_file = Path(directory) / "diagram with spaces.md"
            markdown_file.write_bytes(raw)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(markdown_file), "--api-base", api_base],
                capture_output=True, text=True, timeout=5,
            )
            self.assertEqual(markdown_file.read_bytes(), raw, "the source document must remain unchanged")
            return result

    def test_posts_full_unicode_markdown_and_prints_only_returned_url(self):
        markdown = '# 흐름 "예시"\r\n\r\n```mermaid\ngraph LR\n A["시작"] --> B["완료"]\n```\n'
        with api_server() as (base, requests):
            result = self.run_client(markdown.encode("utf-8"), base)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "https://tools.camp/example\n")
        self.assertEqual(result.stderr, "")
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["path"], "/api/v1/mdedit")
        self.assertEqual(requests[0]["headers"]["Content-Type"], "application/json")
        self.assertNotIn("Authorization", requests[0]["headers"])
        self.assertEqual(json.loads(requests[0]["body"]), {"markdown": markdown})

    def test_accepts_utf8_markdown_at_exactly_64_kib_even_when_json_is_larger(self):
        markdown = "가" * (CLIENT.MAX_BYTES // 3) + "a" * (CLIENT.MAX_BYTES % 3)
        raw = markdown.encode("utf-8")
        self.assertEqual(len(raw), CLIENT.MAX_BYTES)
        with api_server() as (base, requests):
            result = self.run_client(raw, base)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertGreater(len(requests[0]["body"]), CLIENT.MAX_BYTES)
        self.assertEqual(json.loads(requests[0]["body"])["markdown"], markdown)

    def test_rejects_oversize_empty_and_invalid_utf8_before_any_request(self):
        with api_server() as (base, requests):
            for raw in [b"a" * (CLIENT.MAX_BYTES + 1), "가".encode("utf-8") * 21846, b"", b" \n\t", b"\xff"]:
                with self.subTest(length=len(raw), beginning=raw[:8]):
                    result = self.run_client(raw, base)
                    self.assertEqual(result.returncode, 1)
                    self.assertEqual(result.stdout, "")
                    self.assertIn("편집 링크 생성 실패", result.stderr)
            self.assertEqual(requests, [])

    def test_rejects_non_201_statuses_and_does_not_retry(self):
        for status in [200, 202, 400, 500]:
            with self.subTest(status=status), api_server(status=status) as (base, requests):
                result = self.run_client(b"# Example", base)
                self.assertEqual(result.returncode, 1)
                self.assertEqual(result.stdout, "")
                self.assertIn(str(status), result.stderr)
                self.assertEqual(len(requests), 1)

    def test_rejects_malformed_json_and_invalid_primary_urls(self):
        invalid_responses = [
            b"invalid JSON", [], None, {}, {"url": None}, {"url": 7},
            {"url": "http://tools.camp/example"}, {"url": "https://example.com/example"},
            {"url": "https://tools.camp/"}, {"url": "https://tools.camp@example.com/example"},
            {"url": "https://tools.camp/example\nforged output"},
            {"url": "https://tools.camp/example\x1b[31m"},
        ]
        for body in invalid_responses:
            # The server's default body is selected by None, so encode JSON null explicitly.
            response = b"null" if body is None else body
            with self.subTest(body=body), api_server(body=response) as (base, requests):
                result = self.run_client(b"# Example", base)
                self.assertEqual(result.returncode, 1)
                self.assertEqual(result.stdout, "")
                self.assertIn("편집 링크 생성 실패", result.stderr)
                self.assertEqual(len(requests), 1)

    def test_reports_timeout_with_30_second_limit_and_no_success_output(self):
        with TemporaryDirectory(prefix="diagram-link-") as directory:
            document = Path(directory) / "diagram.md"
            document.write_text("# Example", encoding="utf-8")
            stdout, stderr = io.StringIO(), io.StringIO()
            with patch.object(CLIENT, "urlopen", side_effect=TimeoutError("timed out")) as request:
                with redirect_stdout(stdout), redirect_stderr(stderr):
                    result = CLIENT.main([str(document)])
            self.assertEqual(result, 1)
            self.assertEqual(stdout.getvalue(), "")
            self.assertIn("timed out", stderr.getvalue())
            self.assertEqual(request.call_count, 1)
            self.assertEqual(request.call_args.kwargs["timeout"], 30)
            self.assertTrue(request.call_args.kwargs["context"].check_hostname)


if __name__ == "__main__":
    unittest.main()
