#!/bin/bash
# Convert logo image to base64
# Usage: ./convert-logo.sh logo.png

if [ -z "$1" ]; then
  echo "Usage: ./convert-logo.sh <image-file>"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "Error: File not found: $1"
  exit 1
fi

echo "Converting $1 to base64..."
BASE64=$(base64 -i "$1" 2>/dev/null || base64 "$1" 2>/dev/null)

# Detect MIME type
EXT="${1##*.}"
case "$EXT" in
  png) MIME="image/png" ;;
  jpg|jpeg) MIME="image/jpeg" ;;
  svg) MIME="image/svg+xml" ;;
  webp) MIME="image/webp" ;;
  *) MIME="image/png" ;;
esac

echo ""
echo "Base64 data URI:"
echo "data:$MIME;base64,$BASE64"
echo ""
echo "Copy the above line and use it in your code!"
