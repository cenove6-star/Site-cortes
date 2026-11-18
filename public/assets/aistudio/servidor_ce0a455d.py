import os, sys, shutil, tempfile, threading, webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote

PORT = 8765
DIR = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(DIR, "Site_Cortes_.html")


class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Expose-Headers", "Content-Disposition, Content-Length")

    def _text(self, code, msg):
        b = msg.encode("utf-8")
        self.send_response(code); self._cors()
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204); self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/ping":
            return self._text(200, "ok")
        if u.path in ("/", "/index.html", "/Site_Cortes_.html"):
            b = open(PAGE, "rb").read()
            self.send_response(200); self._cors()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers(); self.wfile.write(b)
            return
        if u.path == "/baixar":
            url = (parse_qs(u.query).get("url") or [""])[0]
            return self.baixar(url)
        self._text(404, "Nao encontrado")

    def baixar(self, url):
        if not url.lower().startswith(("http://", "https://")):
            return self._text(400, "Link invalido.")
        tmp = tempfile.mkdtemp(prefix="cortes_")
        try:
            import yt_dlp
            opts = {
                "outtmpl": os.path.join(tmp, "%(id)s.%(ext)s"),
                "format": "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[ext=mp4]/b",
                "merge_output_format": "mp4",
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
            }
            try:
                import imageio_ffmpeg
                opts["ffmpeg_location"] = imageio_ffmpeg.get_ffmpeg_exe()
            except Exception:
                pass
            with yt_dlp.YoutubeDL(opts) as y:
                info = y.extract_info(url, download=True)
                rd = (info.get("requested_downloads") or [{}])[0]
                path = rd.get("filepath") or y.prepare_filename(info)
            if not os.path.exists(path):
                files = [os.path.join(tmp, f) for f in os.listdir(tmp)]
                path = max(files, key=os.path.getsize)
            size = os.path.getsize(path)
            title = "".join(c for c in (info.get("title") or "video") if c not in '\\/:*?"<>|')[:80] or "video"
            self.send_response(200); self._cors()
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(size))
            self.send_header("Content-Disposition", "attachment; filename*=UTF-8''" + quote(title + ".mp4"))
            self.end_headers()
            with open(path, "rb") as f:
                shutil.copyfileobj(f, self.wfile, 1024 * 1024)
        except Exception as e:
            try:
                self._text(500, str(e)[:300])
            except Exception:
                pass
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print(f"Servidor ligado em http://localhost:{PORT}  (feche esta janela para desligar)")
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
