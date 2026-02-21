# azb-server-monitor

Lightweight self-hosted server health dashboard built with Node.js.

Displays ZFS pool usage, CPU load, memory, pending security updates, and system info — accessible from any machine on your local network.

## Features

- ZFS pool usage with health status
- CPU and RAM utilization
- Pending security updates
- Uptime, hostname, load averages
- Auto-refreshes every 5 seconds
- Modern dark UI, no external dependencies

## Requirements

- Node.js 18+
- Linux with ZFS and `apt` (Ubuntu/Debian)

## Setup

```bash
git clone https://github.com/oxymoron/azb-server-monitor.git
cd azb-server-monitor
node server.js
```

Open `http://<your-server-ip>:3000` in a browser.

## Run as a service

```bash
sudo cp azb-server-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now azb-server-monitor
```

## License

MIT
