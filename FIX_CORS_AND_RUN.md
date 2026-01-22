# Fix CORS and Run Import

## The Problem
The browser is blocking requests due to CORS. The HTTP server needs CORS headers.

## Quick Fix - Run This on Server

SSH into the server and run:

```bash
ssh doug@69.169.103.23
cd /var/www/socialpolitician-app/data

# Stop old server
pkill -f 'python3.*8888'

# Start server with CORS (one-liner)
python3 -c "
import http.server, socketserver
class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
socketserver.TCPServer(('', 8888), CORSHandler).serve_forever()
" &
```

## Then Run the Import Script Again

1. Make sure SSH tunnel is running: `ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23`
2. Go to PocketBase Admin UI
3. Open browser console (F12)
4. Run the script from `COPY_PASTE_THIS.js` again

## Alternative: Use Embedded Data

If CORS continues to be an issue, you can:
1. Copy the JSON data from the server
2. Embed it directly in the script
3. Run the import without needing HTTP server

See `IMPORT_WITH_EMBEDDED_DATA.js` for the template.
