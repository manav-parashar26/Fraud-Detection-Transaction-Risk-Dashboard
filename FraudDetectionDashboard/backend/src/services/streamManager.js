const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isDatabaseConnected } = require('../config/database');
const { getEngineExecutablePath, getEngineDirectory } = require('../config/engine');
const Transaction = require('../models/Transaction');
const FraudAlert = require('../models/FraudAlert');

/**
 * Service to manage the continuous C++ real-time streaming subprocess
 * and broadcast events through Socket.IO.
 */
class StreamManager {
    constructor() {
        this.process = null;
        this.isRunning = false;
        this.io = null;
        this.startTime = null;
        this.txCount = 0;
        this.lineBuffer = '';

        // Bind clean shutdown handlers
        const cleanup = () => this.stopMonitoring();
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('exit', cleanup);
    }

    init(ioInstance) {
        this.io = ioInstance;
        this.io.on('connection', (socket) => {
            // Immediately send current monitoring status upon connection
            socket.emit('monitoring:status', this.getStatus());

            socket.on('disconnect', () => {
                // Socket disconnected cleanly
            });
        });
    }

    getExecutablePath() {
        return getEngineExecutablePath();
    }

    getEngineDir() {
        return getEngineDirectory();
    }

    startMonitoring() {
        if (this.isRunning && this.process) {
            return {
                success: false,
                message: 'Monitoring is already active',
                running: true,
                pid: this.process.pid
            };
        }

        const executable = this.getExecutablePath();
        this.lineBuffer = '';
        this.txCount = 0;
        this.startTime = Date.now();

        try {
            this.process = spawn(executable, ['--stream'], {
                cwd: this.getEngineDir(),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.isRunning = true;

            // Handle incoming stdout stream chunks from C++
            this.process.stdout.on('data', (chunk) => {
                this.lineBuffer += chunk.toString('utf8');
                const lines = this.lineBuffer.split('\n');
                this.lineBuffer = lines.pop(); // Keep remainder

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    try {
                        const eventData = JSON.parse(trimmed);
                        this.handleStreamEvent(eventData);
                    } catch (err) {
                        console.error('[Stream Parse Error]', err.message, 'Raw line:', trimmed);
                    }
                }
            });

            this.process.stderr.on('data', (errChunk) => {
                console.error('[C++ Stream Stderr]', errChunk.toString());
            });

            this.process.on('error', (err) => {
                console.error('[C++ Stream Process Error]', err);
                this.isRunning = false;
                this.process = null;
                if (this.io) {
                    this.io.emit('monitoring:status', this.getStatus());
                }
            });

            this.process.on('close', (code) => {
                console.log(`[C++ Stream Exited] Code: ${code}`);
                this.isRunning = false;
                this.process = null;
                if (this.io) {
                    this.io.emit('monitoring:status', this.getStatus());
                }
            });

            if (this.io) {
                this.io.emit('monitoring:status', this.getStatus());
            }

            return {
                success: true,
                message: 'Monitoring started successfully',
                running: true,
                pid: this.process.pid
            };
        } catch (err) {
            this.isRunning = false;
            this.process = null;
            throw err;
        }
    }

    handleStreamEvent(data) {
        this.txCount++;

        if (!this.io) return;

        // 1. Always emit transaction:update
        this.io.emit('transaction:update', data);

        // 2. If risk score >= 30, emit prioritized fraud:alert event
        if (data.transaction && data.transaction.riskScore >= 30) {
            const alertPayload = {
                transactionId: data.transaction.transactionId,
                accountId: data.transaction.sender,
                sender: data.transaction.sender,
                receiver: data.transaction.receiver,
                amount: data.transaction.amount,
                timestamp: data.transaction.timestamp,
                riskScore: data.transaction.riskScore,
                riskLevel: data.transaction.riskLevel,
                reasons: (data.alerts || []).map((a) => a.reason),
                isCritical: data.transaction.riskScore >= 80
            };
            this.io.emit('fraud:alert', alertPayload);
        }

        // 3. Emit analytics:update for dashboard KPIs
        if (data.analytics) {
            this.io.emit('analytics:update', data.analytics);
        }

        // 4. Emit network:update if network information is present
        if (data.network) {
            this.io.emit('network:update', data.network);
        }

        // 5. Asynchronously persist to MongoDB without blocking WebSocket broadcast
        if (isDatabaseConnected() && data.transaction) {
            const tx = data.transaction;
            Transaction.updateOne(
                { transactionId: tx.transactionId },
                {
                    $set: {
                        transactionId: tx.transactionId,
                        sender: tx.sender,
                        receiver: tx.receiver,
                        amount: tx.amount,
                        timestamp: tx.timestamp,
                        deviceId: tx.deviceId || '',
                        location: tx.location || '',
                        riskScore: tx.riskScore || 0,
                        riskLevel: tx.riskLevel || 'LOW',
                        isFraud: Boolean(tx.isFraud),
                        reasons: (data.alerts || []).map((a) => a.reason)
                    }
                },
                { upsert: true }
            ).catch((dbErr) => {
                console.error('[Stream Tx DB Error]', dbErr.message);
            });

            if (tx.riskScore >= 30) {
                FraudAlert.updateOne(
                    { transactionId: tx.transactionId, accountId: tx.sender },
                    {
                        $set: {
                            transactionId: tx.transactionId,
                            accountId: tx.sender,
                            riskScore: tx.riskScore,
                            riskLevel: tx.riskLevel,
                            reasons: (data.alerts || []).map((a) => a.reason),
                            timestamp: tx.timestamp
                        }
                    },
                    { upsert: true }
                ).catch((dbErr) => {
                    console.error('[Stream Alert DB Error]', dbErr.message);
                });
            }
        }
    }

    stopMonitoring() {
        if (!this.isRunning || !this.process) {
            return {
                success: true,
                message: 'Monitoring is not running',
                running: false
            };
        }

        try {
            const pid = this.process.pid;
            if (process.platform === 'win32') {
                const { execSync } = require('child_process');
                try {
                    execSync(`taskkill /pid ${pid} /T /F 2>nul`);
                } catch (e) {
                    // Taskkill might error if already terminated
                }
            } else {
                this.process.kill('SIGTERM');
            }
        } catch (err) {
            console.error('[Stop Monitoring Error]', err.message);
        }

        this.isRunning = false;
        this.process = null;

        if (this.io) {
            this.io.emit('monitoring:status', this.getStatus());
        }

        return {
            success: true,
            message: 'Monitoring stopped successfully',
            running: false
        };
    }

    getStatus() {
        return {
            running: this.isRunning,
            pid: this.process ? this.process.pid : null,
            uptime: this.isRunning && this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
            transactionsEmitted: this.txCount
        };
    }
}

module.exports = new StreamManager();
