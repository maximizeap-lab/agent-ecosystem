#!/bin/bash
# Starts cloudflared quick tunnel and writes the URL to a file
# so the MAP HQ server can serve it at /url

URL_FILE="$(dirname "$0")/../logs/tunnel_url.txt"
mkdir -p "$(dirname "$URL_FILE")"
echo "" > "$URL_FILE"

cloudflared tunnel --url http://localhost:8000 2>&1 | while IFS= read -r line; do
    echo "$line"
    if echo "$line" | grep -q "trycloudflare.com"; then
        url=$(echo "$line" | grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com')
        if [ -n "$url" ]; then
            echo "$url" > "$URL_FILE"
            echo "MAP HQ tunnel URL: $url"
            echo "Mobile app: ${url}/m"
        fi
    fi
done
