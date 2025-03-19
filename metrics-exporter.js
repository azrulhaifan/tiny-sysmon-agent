require('dotenv').config();
const axios = require('axios');
const os = require('os');
const si = require('systeminformation');

// Add logging utility
const LOG_LEVEL = process.env.LOG_LEVEL || 'NONE';
const logger = {
  none: () => {},
  debug: (...args) => LOG_LEVEL === 'DEBUG' && console.log('[DEBUG]', ...args),
  info: (...args) => ['INFO', 'DEBUG'].includes(LOG_LEVEL) && console.log('[INFO]', ...args),
  error: (...args) => ['ERROR', 'INFO', 'DEBUG'].includes(LOG_LEVEL) && console.error('[ERROR]', ...args)
};

// Konfigurasi dari .env
const config = {
  apiUrl: process.env.THIRD_PARTY_API_URL,
  apiKey: process.env.THIRD_PARTY_API_KEY,
  exportInterval: parseInt(process.env.EXPORT_INTERVAL_MS) || 60000,
  enableCpu: process.env.ENABLE_CPU_METRICS !== 'false',
  enableMemory: process.env.ENABLE_MEMORY_METRICS !== 'false',
  enableSwap: process.env.ENABLE_SWAP_METRICS !== 'false', 
  enableDiskIO: process.env.ENABLE_DISK_IO_METRICS !== 'false',
  enableDiskSpace: process.env.ENABLE_DISK_SPACE_METRICS !== 'false',
  enableNetwork: process.env.ENABLE_NETWORK_METRICS !== 'false'  // Tambahkan ini
};

// Fungsi untuk mengumpulkan dan mengirim metrics
async function collectAndExportMetrics() {
  try {
    if (!config.apiUrl || !config.apiKey) {
      logger.error('Missing API configuration. Please check your .env file for THIRD_PARTY_API_URL and THIRD_PARTY_API_KEY');
      return;
    }

    // Objek untuk menyimpan metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      uptime: os.uptime()
    };

    // Mengumpulkan CPU metrics jika diaktifkan
    if (config.enableCpu) {
      const cpuLoad = await si.currentLoad();
      metrics.cpu = {
        currentLoad: parseFloat(cpuLoad.currentLoad.toFixed(2)),
      };
    }

    // Mengumpulkan Memory metrics jika diaktifkan
    if (config.enableMemory) {
      const memInfo = await si.mem();
      metrics.memory = {
        total: memInfo.total,
        used: memInfo.used,
        free: memInfo.free,
        active: memInfo.active,
        available: memInfo.available,
        usedPercent: parseFloat(((memInfo.used / memInfo.total) * 100).toFixed(2))
      };
    }

    // Mengumpulkan Swap metrics jika diaktifkan
    if (config.enableSwap) {
      const memInfo = await si.mem();
      metrics.swap = {
        total: memInfo.swaptotal,
        used: memInfo.swapused,
        free: memInfo.swapfree,
        usedPercent: memInfo.swaptotal ? parseFloat(((memInfo.swapused / memInfo.swaptotal) * 100).toFixed(2)) : 0
      };
    }

    // Mengumpulkan Disk IO metrics jika diaktifkan
    if (config.enableDiskIO) {
      const diskIO = await si.disksIO();
      metrics.diskIO = {
        readOps: diskIO.rIO,
        writeOps: diskIO.wIO,
        readOpsPerSec: diskIO.rIO_sec || 0,
        writeOpsPerSec: diskIO.wIO_sec || 0,
        totalOpsPerSec: (diskIO.rIO_sec || 0) + (diskIO.wIO_sec || 0)
      };
    }

    // Mengumpulkan Disk Space metrics jika diaktifkan
    if (config.enableDiskSpace) {
      const fsSize = await si.fsSize();
      metrics.disks = fsSize.map(disk => ({
        name: disk.fs,
        mount: disk.mount,
        type: disk.type,
        size: disk.size,
        used: disk.used,
        available: disk.available,
        usePercent: parseFloat(disk.use.toFixed(2))
      }));
    }

    // Mengumpulkan Network metrics jika diaktifkan
    if (config.enableNetwork) {
      const networkStats = await si.networkStats();
      metrics.network = {
        total: {
          rx_bytes: networkStats.reduce((acc, net) => acc + net.rx_bytes, 0),
          tx_bytes: networkStats.reduce((acc, net) => acc + net.tx_bytes, 0),
          rx_sec: networkStats.reduce((acc, net) => acc + (net.rx_sec || 0), 0),
          tx_sec: networkStats.reduce((acc, net) => acc + (net.tx_sec || 0), 0)
        },
        // interfaces: networkStats.map(net => ({
        //   iface: net.iface,
        //   operstate: net.operstate,
        //   rx_bytes: net.rx_bytes,
        //   tx_bytes: net.tx_bytes,
        //   rx_sec: net.rx_sec || 0,
        //   tx_sec: net.tx_sec || 0
        // }))
      };
    }

    logger.debug(`PAYLOAD: ${JSON.stringify(metrics)}`);
    logger.info(`Sending metrics to ${config.apiUrl}`);
    
    const response = await axios.post(config.apiUrl, metrics, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      }
    });

    logger.info(`Metrics exported successfully. Status: ${response.status}`);
    logger.debug(`RESPONSE: ${JSON.stringify(response.data)}`);
    
  } catch (error) {
    logger.error('Error exporting metrics:', error.message);
    if (error.response) {
      logger.error(`API response error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
  }
}

function startExporter() {
  logger.info(`Starting metrics exporter. Sending metrics every ${config.exportInterval}ms to ${config.apiUrl}`);
  logger.info(`Metrics enabled: CPU=${config.enableCpu}, Memory=${config.enableMemory}, Swap=${config.enableSwap}, DiskIO=${config.enableDiskIO}, DiskSpace=${config.enableDiskSpace}, Network=${config.enableNetwork}`);
  
  collectAndExportMetrics();
  setInterval(collectAndExportMetrics, config.exportInterval);
}

// Mulai exporter jika file dijalankan langsung (bukan di-require)
if (require.main === module) {
  startExporter();
}

module.exports = { startExporter, collectAndExportMetrics };