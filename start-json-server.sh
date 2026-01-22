#!/bin/bash
# Start JSON server with CORS on port 8888

cd /var/www/socialpolitician-app/data

# Kill any existing server
pkill -f 'python3.*8888' 2>/dev/null
sleep 1

# Start server with CORS
nohup python3 -c "
import http.server
import socketserver

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

PORT = 8888
with socketserver.TCPServer(('', PORT), CORSHandler) as httpd:
    httpd.serve_forever()
" > /tmp/json-server-cors.log 2>&1 &

echo "Server started on port 8888 with CORS"
sleep 2

# Verify
if curl -s -I http://127.0.0.1:8888/senators_import_ready.json | grep -q 'Access-Control-Allow-Origin'; then
    echo "✅ CORS headers working"
else
    echo "⚠️  Server may not be responding correctly"
fi
