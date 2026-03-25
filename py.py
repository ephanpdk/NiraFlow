from http.server import HTTPServer, BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"""<!DOCTYPE html>
<html>
<head><title>Python App</title></head>
<body>
<h1>Hello from Python!</h1>
<p>Your app is running successfully on Replit.</p>
</body>
</html>""")

    def log_message(self, format, *args):
        print(format % args)

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 5000), Handler)
    print("Server running on http://0.0.0.0:5000")
    server.serve_forever()
