# Disk I/O Metrics Availability

## Overview

This project collects system metrics, including **disk read and write bytes per second**. However, the availability of these metrics depends on the operating system.

## Disk Read & Write Metrics

The disk read (`rB_sec`) and write (`wB_sec`) **bytes per second** metrics are primarily obtained from `/proc/diskstats`, which is only available on **Linux** systems.

### ⚠️ Platform Limitations

- ✅ **Linux**: Fully supported using `/proc/diskstats`.
- ❌ **macOS & Windows**: These metrics may not be available or may always return `0` due to OS limitations.

## Why Is This the Case?

- **Linux exposes detailed disk statistics in `/proc/diskstats`**, which allows real-time tracking of disk I/O operations.
- **macOS and Windows do not provide an equivalent real-time disk I/O interface**, making it difficult to retrieve these exact metrics.

## Workarounds for Non-Linux Systems

If you need disk I/O statistics on **macOS or Windows**, consider alternative approaches:

- **macOS**: Use `iostat -d -w 1` to monitor disk I/O activity.
- **Windows**: Use `Get-Counter` in PowerShell or **Performance Monitor** (`perfmon.msc`).

## Conclusion

If you are running this monitoring script on **Linux**, you will get accurate disk read/write metrics. On **macOS and Windows**, these values might not be available.
