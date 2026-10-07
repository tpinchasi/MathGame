#!/usr/bin/env python3
"""Static file server for the game.

Serves only the ./public folder and listens only on localhost, so the
Cloudflare tunnel is the single way in from the internet.
"""
import functools
import http.server
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
PORT = int(os.environ.get("PORT", "8787"))


class Handler(http.server.SimpleHTTPRequestHandler):
    # keep connections open: the page loads about 25 files at once
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    # The default queue holds 5 waiting connections. A browser opening the game sends more than
    # that at once, the extra ones were refused, one script failed and the page stayed empty.
    request_queue_size = 128
    daemon_threads = True


def serve(root, port):
    handler = functools.partial(Handler, directory=root)
    with Server(("127.0.0.1", port), handler) as srv:
        print(f"serving {root} on http://127.0.0.1:{port}")
        srv.serve_forever()


if __name__ == "__main__":
    serve(ROOT, PORT)
