require('dotenv').config();
const axios = require('axios');
const os = require('os');
const si = require('systeminformation');

// Konfigurasi dari .env
const config = {
  apiUrl: process.env.THIRD_PARTY_API_URL,
  apiKey: process.env.THIRD_PARTY_API_KEY,
  exportInterval: parseInt(process.env.EXPORT_INTERVAL_MS) || 60000,
  enableCpu: process.env.ENABLE_CPU_METRICS !== 'false',
  enableMemory: process.env.ENABLE_MEMORY_METRICS !== 'false',
  enableSwap: process.env.ENABLE_SWAP_METRICS !== 'false', 
  enableDiskIO: process.env.ENABLE_DISK_IO_METRICS !== 'false',
  enableDiskSpace: process.env.ENABLE_DISK_SPACE_METRICS !== 'false'
};

// Fungsi untuk mengumpulkan dan mengirim metrics
async function collectAndExportMetrics() {
  try {
    if (!config.apiUrl || !config.apiKey) {
      console.error('Missing API configuration. Please check your .env file for THIRD_PARTY_API_URL and THIRD_PARTY_API_KEY');
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

    // Mengirim data ke API pihak ketiga
    console.log(`Sending metrics to ${config.apiUrl}`);
    
    const response = await axios.post(config.apiUrl, metrics, {
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': config.apiKey
      }
    });

    console.log(`Metrics exported successfully. Status: ${response.status}`);
    console.log(`RESPONSE: ` + JSON.stringify(response.data));
    
  } catch (error) {
    console.error('Error exporting metrics:', error.message);
    if (error.response) {
      console.error(`API response error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Fungsi untuk memulai exporter
function startExporter() {
  console.log(`Starting metrics exporter. Sending metrics every ${config.exportInterval}ms to ${config.apiUrl}`);
  console.log(`Metrics enabled: CPU=${config.enableCpu}, Memory=${config.enableMemory}, Swap=${config.enableSwap}, DiskIO=${config.enableDiskIO}, DiskSpace=${config.enableDiskSpace}`);
  
  // Jalankan ekspor pertama
  collectAndExportMetrics();
  
  // Jadwalkan ekspor berikutnya
  setInterval(collectAndExportMetrics, config.exportInterval);
}

// Mulai exporter jika file dijalankan langsung (bukan di-require)
if (require.main === module) {
  startExporter();
}

module.exports = { startExporter, collectAndExportMetrics };