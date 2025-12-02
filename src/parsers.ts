import type { ClashProxy } from './config';

/**
 * Parse Shadowsocks (SS) link
 * Format: ss://base64(method:password)@host:port#name
 */
function parseShadowsocks(link: string): ClashProxy | null {
    try {
        const [encodedPart, name] = link.slice(5).split('#');

        // Decode the base64 part
        const decoded = atob(encodedPart);
        const [methodPassword, hostPort] = decoded.split('@');
        const [method, password] = methodPassword.split(':');
        const [host, port] = hostPort.split(':');

        return {
            name: decodeURIComponent(name || host),
            type: 'ss',
            server: host,
            port: parseInt(port, 10),
            cipher: method,
            password: password,
        };
    } catch (error) {
        console.error('Failed to parse SS link:', error);
        return null;
    }
}

/**
 * Parse VMess link
 * Format: vmess://base64(json_config)
 */
function parseVMess(link: string): ClashProxy | null {
    try {
        const encodedPart = link.slice(8);
        const decoded = atob(encodedPart);
        const config = JSON.parse(decoded);

        const proxy: ClashProxy = {
            name: config.ps || config.add,
            type: 'vmess',
            server: config.add,
            port: parseInt(config.port, 10),
            uuid: config.id,
            alterId: parseInt(config.aid || 0, 10),
            cipher: 'auto',
        };

        // Add TLS if enabled
        if (config.tls && config.tls !== 'none') {
            proxy.tls = true;
        }

        // Add network type
        if (config.net) {
            proxy.network = config.net;
        }

        // Add WebSocket path for ws network
        if (config.net === 'ws' && config.path) {
            proxy['ws-path'] = config.path;
        }

        // Add WebSocket headers if host is specified
        if (config.net === 'ws' && config.host) {
            proxy['ws-headers'] = {
                Host: config.host,
            };
        }

        return proxy;
    } catch (error) {
        console.error('Failed to parse VMess link:', error);
        return null;
    }
}

/**
 * Main parser that routes to appropriate parser based on protocol
 */
export function linkToConfig(link: string): ClashProxy | null {
    if (link.startsWith('ss://')) {
        return parseShadowsocks(link);
    } else if (link.startsWith('vmess://')) {
        return parseVMess(link);
    }

    console.warn('Unsupported protocol:', link.substring(0, 10));
    return null;
}

/**
 * Remove undefined properties from an object
 */
export function deleteUndefined<T extends Record<string, any>>(obj: T): T {
    const result = { ...obj };
    for (const key in result) {
        if (result[key] === undefined) {
            delete result[key];
        }
    }
    return result;
}

/**
 * Convert V2Ray subscription content to Clash proxies
 */
export function convertSubscription(content: string): ClashProxy[] {
    return content
        .trim()
        .split('\n')
        .map((link) => linkToConfig(link.trim()))
        .filter((config): config is ClashProxy => config !== null)
        .map(deleteUndefined);
}
