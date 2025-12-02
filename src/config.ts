/**
 * Default Clash configuration template with rule-providers
 */
export interface ClashProxy {
    name: string;
    type: string;
    server: string;
    port: number;
    cipher?: string;
    password?: string;
    uuid?: string;
    alterId?: number;
    tls?: boolean;
    network?: string;
    'ws-path'?: string;
    'ws-headers'?: Record<string, string>;
}

export interface ClashProxyGroup {
    name: string;
    type: string;
    proxies: string[];
    url?: string;
    interval?: number;
}

export interface RuleProvider {
    type: string;
    behavior: string;
    url: string;
    path: string;
    interval: number;
}

export interface ClashConfig {
    'mixed-port': number;
    'external-controller': string;
    'allow-lan': boolean;
    mode: string;
    'log-level': string;
    proxies: ClashProxy[];
    'proxy-groups': ClashProxyGroup[];
    'rule-providers': Record<string, RuleProvider>;
    rules: string[];
}

const ruleProviders: Record<string, RuleProvider> = {
    reject: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt',
        path: './ruleset/reject.yaml',
        interval: 86400,
    },
    icloud: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/icloud.txt',
        path: './ruleset/icloud.yaml',
        interval: 86400,
    },
    apple: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/apple.txt',
        path: './ruleset/apple.yaml',
        interval: 86400,
    },
    google: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/google.txt',
        path: './ruleset/google.yaml',
        interval: 86400,
    },
    proxy: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt',
        path: './ruleset/proxy.yaml',
        interval: 86400,
    },
    direct: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt',
        path: './ruleset/direct.yaml',
        interval: 86400,
    },
    private: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt',
        path: './ruleset/private.yaml',
        interval: 86400,
    },
    gfw: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt',
        path: './ruleset/gfw.yaml',
        interval: 86400,
    },
    'tld-not-cn': {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt',
        path: './ruleset/tld-not-cn.yaml',
        interval: 86400,
    },
    telegramcidr: {
        type: 'http',
        behavior: 'ipcidr',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt',
        path: './ruleset/telegramcidr.yaml',
        interval: 86400,
    },
    cncidr: {
        type: 'http',
        behavior: 'ipcidr',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt',
        path: './ruleset/cncidr.yaml',
        interval: 86400,
    },
    lancidr: {
        type: 'http',
        behavior: 'ipcidr',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/lancidr.txt',
        path: './ruleset/lancidr.yaml',
        interval: 86400,
    },
    applications: {
        type: 'http',
        behavior: 'classical',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/applications.txt',
        path: './ruleset/applications.yaml',
        interval: 86400,
    },
};

// Whitelist mode rules (Recommended) - Traffic not matching any rule will be proxied
const whitelistRules = [
    'RULE-SET,applications,DIRECT',
    'DOMAIN,clash.razord.top,DIRECT',
    'DOMAIN,yacd.haishan.me,DIRECT',
    'RULE-SET,private,DIRECT',
    'RULE-SET,reject,REJECT',
    'RULE-SET,icloud,DIRECT',
    'RULE-SET,apple,DIRECT',
    'RULE-SET,google,PROXY',
    'RULE-SET,proxy,PROXY',
    'RULE-SET,direct,DIRECT',
    'RULE-SET,lancidr,DIRECT',
    'RULE-SET,cncidr,DIRECT',
    'RULE-SET,telegramcidr,PROXY',
    'GEOIP,LAN,DIRECT',
    'GEOIP,CN,DIRECT',
    'MATCH,PROXY',
];

// Blacklist mode rules - Only traffic matching rules will be proxied
const blacklistRules = [
    'RULE-SET,applications,DIRECT',
    'DOMAIN,clash.razord.top,DIRECT',
    'DOMAIN,yacd.haishan.me,DIRECT',
    'RULE-SET,private,DIRECT',
    'RULE-SET,reject,REJECT',
    'RULE-SET,tld-not-cn,PROXY',
    'RULE-SET,gfw,PROXY',
    'RULE-SET,telegramcidr,PROXY',
    'MATCH,DIRECT',
];

export const defaultConfig: ClashConfig = {
    'mixed-port': 7890,
    'external-controller': '127.0.0.1:9090',
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'warning',
    proxies: [],
    'proxy-groups': [],
    'rule-providers': ruleProviders,
    rules: whitelistRules, // Default to whitelist mode
};

/**
 * Get rules based on mode
 * @param mode - 'whitelist' or 'blacklist'
 */
export function getRulesByMode(mode: string): string[] {
    return mode === 'blacklist' ? blacklistRules : whitelistRules;
}
