#!/usr/bin/env python3
"""
HTTP server with CORS headers for serving JSON files
Run: python3 server-json-with-cors.py
"""

import http.server
import socketserver
import os

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == '__main__':
    PORT = 8888
    os.chdir('/var/www/socialpolitician-app/data')
    
    with socketserver.TCPServer(('', PORT), CORSRequestHandler) as httpd:
        print(f'✅ HTTP server with CORS started on port {PORT}')
        print(f'   Serving files from: {os.getcwd()}')
        print(f'   Access: http://127.0.0.1:{PORT}/senators_import_ready.json')
        httpd.serve_forever()
