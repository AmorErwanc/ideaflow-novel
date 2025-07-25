// 监控和日志系统
class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.metrics = {
            api: {
                total: 0,
                success: 0,
                failed: 0,
                responseTime: []
            },
            workflow: {
                started: 0,
                completed: 0,
                failed: 0,
                abandonedAt: {
                    ideas: 0,
                    outline: 0,
                    novel: 0,
                    script: 0
                }
            },
            errors: []
        };
        this.initializeStorage();
    }

    // 初始化本地存储
    initializeStorage() {
        const savedLogs = localStorage.getItem('app_logs');
        const savedMetrics = localStorage.getItem('app_metrics');
        
        if (savedLogs) {
            try {
                this.logs = JSON.parse(savedLogs);
            } catch (e) {
                console.error('Failed to parse saved logs:', e);
            }
        }
        
        if (savedMetrics) {
            try {
                this.metrics = JSON.parse(savedMetrics);
            } catch (e) {
                console.error('Failed to parse saved metrics:', e);
            }
        }
    }

    // 记录日志
    log(level, message, data = {}) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.logs.push(entry);
        
        // 保持日志大小在限制内
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // 在控制台输出
        const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
        console[consoleMethod](`[${level}] ${message}`, data);

        // 保存到本地存储
        this.saveToStorage();

        // 严重错误发送到服务器（如果配置了端点）
        if (level === 'ERROR' || level === 'CRITICAL') {
            this.reportError(entry);
        }

        return entry;
    }

    // 便捷方法
    info(message, data) {
        return this.log('INFO', message, data);
    }

    warn(message, data) {
        return this.log('WARN', message, data);
    }

    error(message, data) {
        return this.log('ERROR', message, data);
    }

    critical(message, data) {
        return this.log('CRITICAL', message, data);
    }

    // API调用监控
    trackAPICall(endpoint, success, responseTime, data = {}) {
        this.metrics.api.total++;
        
        if (success) {
            this.metrics.api.success++;
        } else {
            this.metrics.api.failed++;
        }
        
        this.metrics.api.responseTime.push({
            time: responseTime,
            endpoint,
            timestamp: new Date().toISOString()
        });

        // 只保留最近1000条响应时间记录
        if (this.metrics.api.responseTime.length > 1000) {
            this.metrics.api.responseTime = this.metrics.api.responseTime.slice(-1000);
        }

        this.info(`API Call: ${endpoint}`, {
            success,
            responseTime: `${responseTime}ms`,
            ...data
        });

        this.saveToStorage();
    }

    // 工作流监控
    trackWorkflowStart() {
        this.metrics.workflow.started++;
        this.info('Workflow started');
        this.saveToStorage();
    }

    trackWorkflowProgress(step) {
        this.info(`Workflow progress: ${step}`);
    }

    trackWorkflowComplete() {
        this.metrics.workflow.completed++;
        const completionRate = ((this.metrics.workflow.completed / this.metrics.workflow.started) * 100).toFixed(2);
        this.info('Workflow completed', { completionRate: `${completionRate}%` });
        this.saveToStorage();
    }

    trackWorkflowAbandonment(step) {
        this.metrics.workflow.failed++;
        if (this.metrics.workflow.abandonedAt[step] !== undefined) {
            this.metrics.workflow.abandonedAt[step]++;
        }
        this.warn(`Workflow abandoned at: ${step}`);
        this.saveToStorage();
    }

    // 用户行为追踪
    trackUserAction(action, data = {}) {
        this.info(`User action: ${action}`, data);
    }

    // 性能监控
    startTimer(operationName) {
        const timerId = `${operationName}_${Date.now()}`;
        performance.mark(`${timerId}_start`);
        return timerId;
    }

    endTimer(timerId, metadata = {}) {
        performance.mark(`${timerId}_end`);
        try {
            performance.measure(timerId, `${timerId}_start`, `${timerId}_end`);
            const measure = performance.getEntriesByName(timerId)[0];
            const duration = measure.duration;
            
            this.info(`Performance: ${timerId.split('_')[0]}`, {
                duration: `${duration.toFixed(2)}ms`,
                ...metadata
            });

            // 清理性能标记
            performance.clearMarks(`${timerId}_start`);
            performance.clearMarks(`${timerId}_end`);
            performance.clearMeasures(timerId);

            return duration;
        } catch (e) {
            this.error('Failed to measure performance', { timerId, error: e.message });
            return 0;
        }
    }

    // 获取统计信息
    getStats() {
        const apiSuccessRate = this.metrics.api.total > 0 
            ? ((this.metrics.api.success / this.metrics.api.total) * 100).toFixed(2)
            : 0;

        const avgResponseTime = this.metrics.api.responseTime.length > 0
            ? this.metrics.api.responseTime.reduce((sum, item) => sum + item.time, 0) / this.metrics.api.responseTime.length
            : 0;

        const workflowCompletionRate = this.metrics.workflow.started > 0
            ? ((this.metrics.workflow.completed / this.metrics.workflow.started) * 100).toFixed(2)
            : 0;

        return {
            api: {
                total: this.metrics.api.total,
                success: this.metrics.api.success,
                failed: this.metrics.api.failed,
                successRate: `${apiSuccessRate}%`,
                avgResponseTime: `${avgResponseTime.toFixed(2)}ms`
            },
            workflow: {
                started: this.metrics.workflow.started,
                completed: this.metrics.workflow.completed,
                failed: this.metrics.workflow.failed,
                completionRate: `${workflowCompletionRate}%`,
                abandonmentPoints: this.metrics.workflow.abandonedAt
            },
            errors: this.metrics.errors.length,
            totalLogs: this.logs.length
        };
    }

    // 获取最近的日志
    getRecentLogs(count = 50, level = null) {
        let logs = this.logs.slice(-count);
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        return logs;
    }

    // 清除日志
    clearLogs() {
        this.logs = [];
        this.saveToStorage();
        this.info('Logs cleared');
    }

    // 导出日志
    exportLogs() {
        const data = {
            logs: this.logs,
            metrics: this.metrics,
            stats: this.getStats(),
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `app-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.info('Logs exported');
    }

    // 保存到本地存储
    saveToStorage() {
        try {
            localStorage.setItem('app_logs', JSON.stringify(this.logs));
            localStorage.setItem('app_metrics', JSON.stringify(this.metrics));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    // 报告错误到服务器（可选）
    async reportError(errorEntry) {
        // 如果配置了错误报告端点，可以在这里实现
        // 目前只在控制台记录
        console.error('Error Report:', errorEntry);
        
        // 保存到错误列表
        this.metrics.errors.push({
            ...errorEntry,
            reported: false
        });
        
        // 只保留最近100个错误
        if (this.metrics.errors.length > 100) {
            this.metrics.errors = this.metrics.errors.slice(-100);
        }
    }

    // 生成唯一ID
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

// 创建全局日志实例
const logger = new Logger();

// 监听全局错误
window.addEventListener('error', (event) => {
    logger.critical('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.stack : 'No stack trace'
    });
});

// 监听Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
    logger.critical('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
    });
});

// 导出logger供其他模块使用
window.logger = logger;