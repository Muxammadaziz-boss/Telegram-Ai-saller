import sys
import subprocess
import re
import time
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import httpx
from app.core.config import settings

def set_tg_webhook(url: str):
    webhook_url = f"{url.rstrip('/')}/telegram/webhook"
    print(f"\n[WEBHOOK] Setting Telegram webhook to: {webhook_url} ...", flush=True)
    tg_endpoint = f"https://api.telegram.org/bot{settings.telegram_bot_token}/setWebhook"
    payload = {
        "url": webhook_url,
        "secret_token": settings.telegram_webhook_secret,
        "allowed_updates": [
            "message", "edited_message", "channel_post", "edited_channel_post",
            "business_connection", "business_message", "edited_business_message",
            "callback_query"
        ]
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(tg_endpoint, json=payload)
            print("[WEBHOOK] Telegram setWebhook response:", resp.json(), flush=True)
    except Exception as e:
        print("[WEBHOOK] Error setting Telegram webhook:", e, flush=True)


def run_ssh_tunnel():
    cmd = [
        "ssh",
        "-o", "ServerAliveInterval=15",
        "-o", "ServerAliveCountMax=3",
        "-o", "StrictHostKeyChecking=no",
        "-R", "80:127.0.0.1:8000",
        "nokey@localhost.run"
    ]
    print(f"[TUNNEL] Launching tunnel: {' '.join(cmd)}", flush=True)
    
    current_url = None
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    for line in iter(proc.stdout.readline, ""):
        sys.stdout.write(line)
        sys.stdout.flush()
        
        # Match *.lhr.life URL pattern
        m = re.search(r"https://[a-zA-Z0-9-]+\.lhr\.life", line)
        if m:
            detected_url = m.group(0).strip()
            if detected_url != current_url:
                current_url = detected_url
                print(f"\n==========================================", flush=True)
                print(f">>> TUNNEL DOMAIN DETECTED: {current_url} <<<", flush=True)
                print(f"==========================================\n", flush=True)
                set_tg_webhook(current_url)

    proc.wait()
    print(f"[TUNNEL] Process exited with code {proc.returncode}. Reconnecting in 3s...", flush=True)


def main():
    while True:
        try:
            run_ssh_tunnel()
        except KeyboardInterrupt:
            print("\nTunnel stopped by user.")
            break
        except Exception as e:
            print(f"[TUNNEL ERROR]: {e}", flush=True)
        time.sleep(3)


if __name__ == "__main__":
    main()
