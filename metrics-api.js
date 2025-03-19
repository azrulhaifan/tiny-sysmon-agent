require('dotenv').config();
const express = require('express');
const os = require('os');
const si = require('systeminformation');
const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi metrik dari .env
const config = {
  enableCpu: process.env.ENABLE_CPU_METRICS !== 'false',
  enableMemory: process.env.ENABLE_MEMORY_METRICS !== 'false',
  enableSwap: process.env.ENABLE_SWAP_METRICS !== 'false',
  enableDiskIO: process.env.ENABLE_DISK_IO_METRICS !== 'false',
  enableDiskSpace: process.env.ENABLE_DISK_SPACE_METRICS !== 'false',
  enableNetwork: process.env.ENABLE_NETWORK_METRICS !== 'false'  
};

// Menyimpan data historis untuk menghitung min, max, avg
let metrics = {
  cpu: [],
  memory: [],
  swap: [],
  diskRead: [],
  diskWrite: [],
  diskIO: [],
  networkIn: [],    
  networkOut: []    
};

// Fungsi untuk mengkonversi bytes ke format yang lebih mudah dibaca
function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return { value: 0, unit: 'GB' };
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return {
    value: parseFloat((bytes / Math.pow(1024, i)).toFixed(2)),
    unit: sizes[i]
  };
}

// Fungsi untuk menghitung statistik
function calculateStats(data) {
  if (data.length === 0) return { avg: 0, min: 0, max: 0 };
  
  const sum = data.reduce((acc, val) => acc + val, 0);
  const avg = sum / data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);
  
  return {
    avg: parseFloat(avg.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2))
  };
}

// Fungsi untuk mengumpulkan data sistem setiap 5 detik
async function collectData() {
  try {
    // CPU Load
    if (config.enableCpu) {
      const cpuLoad = await si.currentLoad();
      metrics.cpu.push(cpuLoad.currentLoad);
      if (metrics.cpu.length > 100) metrics.cpu.shift();
    }
    
    // Memory Load
    if (config.enableMemory) {
      const memInfo = await si.mem();
      const memoryLoad = (memInfo.used / memInfo.total) * 100;
      metrics.memory.push(memoryLoad);
      if (metrics.memory.length > 100) metrics.memory.shift();
    }
    
    // Swap Load
    if (config.enableSwap) {
      const memInfo = await si.mem();
      const swapLoad = (memInfo.swapused / memInfo.swaptotal) * 100 || 0;
      metrics.swap.push(swapLoad);
      if (metrics.swap.length > 100) metrics.swap.shift();
    }
    
    // Disk IO
    if (config.enableDiskIO) {
      const diskIO = await si.disksIO();
      metrics.diskRead.push(diskIO.rIO_sec || 0);  // Read operations per second
      metrics.diskWrite.push(diskIO.wIO_sec || 0); // Write operations per second
      metrics.diskIO.push((diskIO.rIO_sec || 0) + (diskIO.wIO_sec || 0)); // Total IO operations per second
      
      if (metrics.diskRead.length > 100) metrics.diskRead.shift();
      if (metrics.diskWrite.length > 100) metrics.diskWrite.shift();
      if (metrics.diskIO.length > 100) metrics.diskIO.shift();
    }
    
    // Network metrics
    if (config.enableNetwork) {
      const networkStats = await si.networkStats();
      const totalRx = networkStats.reduce((acc, net) => acc + net.rx_sec, 0);
      const totalTx = networkStats.reduce((acc, net) => acc + net.tx_sec, 0);
      
      metrics.networkIn.push(totalRx);
      metrics.networkOut.push(totalTx);
      
      if (metrics.networkIn.length > 100) metrics.networkIn.shift();
      if (metrics.networkOut.length > 100) metrics.networkOut.shift();
    }

  } catch (error) {
    console.error('Error collecting system data:', error);
  }
}

// Mulai mengumpulkan data
const collectionInterval = parseInt(process.env.COLLECTION_INTERVAL_MS) || 5000;
setInterval(collectData, collectionInterval);
collectData(); // Panggil sekali di awal

// Route untuk mendapatkan semua data sistem
app.get('/api/system-metrics', async (req, res) => {
  try {
    // Menghitung uptime
    const uptimeSeconds = os.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / (3600 * 24));
    const uptimeHours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeString = `${uptimeDays} days, ${uptimeHours} hours, ${uptimeMinutes} minutes`;
    
    // Inisialisasi response
    const response = {
      uptime: uptimeString
    };
    
    // Tambahkan CPU metrics jika diaktifkan
    if (config.enableCpu) {
      response.cpu = {
        load: calculateStats(metrics.cpu)
      };
    }
    
    // Tambahkan Memory metrics jika diaktifkan
    if (config.enableMemory) {
      const memInfo = await si.mem();
      response.memory = {
        load_percent: calculateStats(metrics.memory),
        total: {
          bytes: memInfo.total,
          formatted: formatBytes(memInfo.total)
        },
        used: {
          bytes: memInfo.used,
          formatted: formatBytes(memInfo.used)
        },
        free: {
          bytes: memInfo.free,
          formatted: formatBytes(memInfo.free)
        }
      };
    }
    
    // Tambahkan Swap metrics jika diaktifkan
    if (config.enableSwap) {
      const memInfo = await si.mem();
      response.swap = {
        load_percent: calculateStats(metrics.swap),
        total: {
          bytes: memInfo.swaptotal,
          formatted: formatBytes(memInfo.swaptotal)
        },
        used: {
          bytes: memInfo.swapused,
          formatted: formatBytes(memInfo.swapused)
        },
        free: {
          bytes: memInfo.swapfree,
          formatted: formatBytes(memInfo.swapfree)
        }
      };
    }
    
    // Tambahkan Disk IO metrics jika diaktifkan
    if (config.enableDiskIO) {
      response.diskIO = {
        operations_per_second: {
          total: calculateStats(metrics.diskIO),
          read: calculateStats(metrics.diskRead),
          write: calculateStats(metrics.diskWrite)
        },
        current: {
          total: metrics.diskIO.length > 0 ? metrics.diskIO[metrics.diskIO.length - 1] : 0,
          read: metrics.diskRead.length > 0 ? metrics.diskRead[metrics.diskRead.length - 1] : 0,
          write: metrics.diskWrite.length > 0 ? metrics.diskWrite[metrics.diskWrite.length - 1] : 0
        }
      };
    }
    
    // Tambahkan Disk Space metrics jika diaktifkan
    if (config.enableDiskSpace) {
      const fsSize = await si.fsSize();
      const disksInfo = await si.blockDevices();
      const disks = fsSize.map(disk => {
        const diskInfo = disksInfo.find(d => d.mount === disk.mount || d.name === disk.fs);
        return {
          name: disk.fs,
          mount: disk.mount,
          type: disk.type,
          size: {
            bytes: disk.size,
            formatted: formatBytes(disk.size)
          },
          used: {
            bytes: disk.used,
            formatted: formatBytes(disk.used)
          },
          available: {
            bytes: disk.available,
            formatted: formatBytes(disk.available)
          },
          use_percent: parseFloat(disk.use.toFixed(2)),
          physical_type: diskInfo ? diskInfo.type : 'unknown',
          model: diskInfo ? diskInfo.model : 'unknown'
        };
      });
      
      response.disks = disks;
    }
    
    // Di dalam route /api/system-metrics, tambahkan sebelum res.json(response)
    // Tambahkan Network metrics jika diaktifkan
    if (config.enableNetwork) {
      response.network = {
        traffic_per_second: {
          in: {
            stats: calculateStats(metrics.networkIn),
            current: metrics.networkIn.length > 0 ? 
              metrics.networkIn[metrics.networkIn.length - 1] : 0,
            formatted: formatBytes(metrics.networkIn.length > 0 ? 
              metrics.networkIn[metrics.networkIn.length - 1] : 0)
          },
          out: {
            stats: calculateStats(metrics.networkOut),
            current: metrics.networkOut.length > 0 ? 
              metrics.networkOut[metrics.networkOut.length - 1] : 0,
            formatted: formatBytes(metrics.networkOut.length > 0 ? 
              metrics.networkOut[metrics.networkOut.length - 1] : 0)
          }
        }
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mulai server
app.listen(port, () => {
  console.log(`System monitoring API running on port ${port}`);
  console.log(`Metrics enabled: CPU=${config.enableCpu}, Memory=${config.enableMemory}, Swap=${config.enableSwap}, DiskIO=${config.enableDiskIO}, DiskSpace=${config.enableDiskSpace}, Network=${config.enableNetwork}`);
});

module.exports = { collectData, metrics };