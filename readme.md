# SysMon Agent

SysMon Agent is a Node.js-based software that collects and exports server resource metrics to the SysMon server. It is designed to run alongside the SysMon server located in the repository [tiny-sysmon-server](https://github.com/azrulhaifan/tiny-sysmon-server).

The agent is built with Node.js (v22 LTS) and supports the collection of the following server resource metrics:

- **CPU Load** (%)
- **Memory Load** (%)
- **Swap Load** (%)
- **Network Traffic** (KB/s)
- **Disk Load (IOPS)**
- **Disk R/W Operations** (KB/s)

**Note:** Currently, the Disk R/W Operations metric is only supported on Linux systems with access to the `/proc/diskstats` file. Other operating systems (e.g., Windows, macOS) are not supported for this metric.

## Features

- Collects and exports server metrics in real-time.
- Supports exporting data to a SysMon server.
- Provides metrics for CPU, memory, swap, network, and disk load.
- Can be configured to export data at specific intervals.
- Supports Linux-based systems for monitoring Disk R/W Operations.

## Requirements

- **Node.js v22 (LTS)**
- Linux-based system for full functionality (especially Disk R/W Operations)
- SysMon server (available at [tiny-sysmon-server](https://github.com/azrulhaifan/tiny-sysmon-server))

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/azrulhaifan/tiny-sysmon-agent.git
   ```

2. Navigate to the project directory:

   ```bash
   cd sysmon-agent
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Set up the `.env` configuration file. Make a copy of the `.env.example` file:

   ```bash
   cp .env.example .env
   ```

5. Edit the `.env` file to configure the following settings:

   ```dotenv
   # Log Level Configuration
   LOG_LEVEL=INFO  # Options: NONE, INFO, ERROR, DEBUG

   # Server Configuration
   PORT=3000  # Port for the agent to run

   # Collection Interval (in milliseconds)
   COLLECTION_INTERVAL_MS=5000  # Interval to collect metrics

   # Exporter Configuration
   THIRD_PARTY_API_URL=https://example.com/api/metrics  # URL of the SysMon server
   THIRD_PARTY_API_KEY=your_api_key_here  # API Key from SysMon server
   EXPORT_INTERVAL_MS=60000  # Interval to export metrics to the SysMon server

   # Enable/Disable Metrics (true/false)
   ENABLE_CPU_METRICS=true
   ENABLE_MEMORY_METRICS=true
   ENABLE_SWAP_METRICS=true
   ENABLE_DISK_IO_METRICS=true
   ENABLE_DISK_SPACE_METRICS=true
   ENABLE_NETWORK_METRICS=true

   # Disk to monitor for Linux systems (only used for Disk R/W Operations)
   MAIN_DISK=sda  # Set the disk label for monitoring on Linux
   ```

6. Start the agent:

   ```bash
   npm run exporter
   ```

7. You can use pm2 to run this agent on background

The agent will start collecting metrics at the interval defined in the `.env` configuration and send them to the configured SysMon server.

## Metrics Collection

The agent collects the following metrics:

- **CPU Load**: The percentage of CPU usage.
- **Memory Load**: The percentage of memory usage.
- **Swap Load**: The percentage of swap memory usage.
- **Network Traffic**: The network traffic in KB/s.
- **Disk Load (IOPS)**: The number of input/output operations per second for the disk.
- **Disk R/W Operations (KB/s)**: The read/write operations on the disk in KB/s (only supported on Linux).

## Exporter Configuration

The agent exports the collected metrics to a SysMon server via HTTP. The configuration options are:

- **THIRD_PARTY_API_URL**: The URL of the SysMon server to which the agent sends the metrics.
- **THIRD_PARTY_API_KEY**: The API key that authenticates the agent with the SysMon server.
- **EXPORT_INTERVAL_MS**: The interval (in milliseconds) at which the agent exports metrics.

## Server API Configuration (Beta)

The agent also exposes a public API for testing and debugging. It can be accessed via the following endpoint:

- **API Endpoint**: `http://localhost:3000/metrics`

## Usage

Once the agent is up and running, it will periodically collect and export the following data based on the configuration set in `.env`:

- Metrics will be sent at the interval defined by `EXPORT_INTERVAL_MS`.
- The agent logs its activities at the level defined by `LOG_LEVEL`.

## Supported Platforms

- **Linux**: Fully supported, including Disk R/W Operations (requires `/proc/diskstats`).
- **Windows** and **macOS**: Only partially supported (Disk R/W Operations metric is not supported on these systems).

## Planning

The following features are planned for future releases:

1. **More proper documentation**
   - Provide more detailed documentation
2. **Support more OS for disk R/W Metrics**

## Contribution

If you would like to contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -am 'Add feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Create a new pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/azrulhaifan/tiny-sysmon-server/blob/main/LICENSE) file for details.

## Acknowledgments

- Node.js v22 LTS for the backend.
- The SysMon server team for the powerful monitoring platform.
- The open-source community for contributions and support.
