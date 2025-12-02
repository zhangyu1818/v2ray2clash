import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import worker from '../src/index';
import { linkToConfig, convertSubscription } from '../src/parsers';
import { getRulesByMode } from '../src/config';



describe('V2Ray to Clash Converter', () => {
	describe('Parsers', () => {
		it('should parse SS link correctly', () => {
			const ssLink = 'ss://' + btoa('aes-256-gcm:password123@example.com:8388') + '#TestServer';
			const result = linkToConfig(ssLink);

			expect(result).toBeDefined();
			expect(result?.type).toBe('ss');
			expect(result?.name).toBe('TestServer');
			expect(result?.server).toBe('example.com');
			expect(result?.port).toBe(8388);
			expect(result?.cipher).toBe('aes-256-gcm');
			expect(result?.password).toBe('password123');
		});

		it('should parse VMess link correctly', () => {
			const vmessConfig = {
				ps: 'TestVMess',
				add: 'vmess.example.com',
				port: '443',
				id: '12345678-1234-1234-1234-123456789abc',
				aid: '0',
				net: 'ws',
				path: '/path',
				host: 'vmess.example.com',
				tls: 'tls',
			};
			const vmessLink = 'vmess://' + btoa(JSON.stringify(vmessConfig));
			const result = linkToConfig(vmessLink);

			expect(result).toBeDefined();
			expect(result?.type).toBe('vmess');
			expect(result?.name).toBe('TestVMess');
			expect(result?.server).toBe('vmess.example.com');
			expect(result?.port).toBe(443);
			expect(result?.uuid).toBe('12345678-1234-1234-1234-123456789abc');
			expect(result?.network).toBe('ws');
			expect(result?.['ws-path']).toBe('/path');
			expect(result?.tls).toBe(true);
		});

		it('should handle invalid links gracefully', () => {
			const invalidLink = 'http://invalid.link';
			const result = linkToConfig(invalidLink);
			expect(result).toBeNull();
		});

		it('should convert multiple V2Ray links', () => {
			const ss1 = 'ss://' + btoa('aes-256-gcm:pass1@server1.com:8388') + '#Server1';
			const ss2 = 'ss://' + btoa('aes-256-gcm:pass2@server2.com:8389') + '#Server2';
			const subscription = `${ss1}\n${ss2}`;

			const proxies = convertSubscription(subscription);
			expect(proxies).toHaveLength(2);
			expect(proxies[0].name).toBe('Server1');
			expect(proxies[1].name).toBe('Server2');
		});
	});

	describe('Rule Modes', () => {
		it('should return whitelist rules by default', () => {
			const rules = getRulesByMode('whitelist');
			expect(rules).toContain('MATCH,PROXY');
			expect(rules).toContain('RULE-SET,proxy,PROXY');
		});

		it('should return blacklist rules when specified', () => {
			const rules = getRulesByMode('blacklist');
			expect(rules).toContain('MATCH,DIRECT');
			expect(rules).toContain('RULE-SET,gfw,PROXY');
		});
	});

	describe('YAML Generation', () => {
		it('should generate valid YAML with js-yaml', () => {
			const obj = { port: 7890, mode: 'rule', 'allow-lan': false };
			const yamlString = yaml.dump(obj);

			expect(yamlString).toContain('port: 7890');
			expect(yamlString).toContain('mode: rule');
			expect(yamlString).toContain('allow-lan: false');
		});
	});

	describe('Worker', () => {
		it('should return usage instructions when path is empty', async () => {
			const request = new Request('http://localhost:8787/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain('Usage:');
			expect(text).toContain('mode');
		});

		it('should handle invalid subscription URL gracefully', async () => {
			const request = new Request('http://localhost:8787/whitelist/http://invalid-url-that-does-not-exist.test');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			// Note: fetch errors are caught by the outer try-catch and return 500
			expect(response.status).toBe(500);
			const text = await response.text();
			expect(text).toContain('Internal error');
		});

		it('should handle blacklist mode correctly', async () => {
			const targetUrl = 'https://example.com/sub?token=abc';
			const request = new Request(`http://localhost:8787/blacklist/${targetUrl}`);
			const ctx = createExecutionContext();

			// Mock fetch
			const originalFetch = globalThis.fetch;
			let fetchedUrl = '';
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				fetchedUrl = input.toString();
				// Return a valid SS link
				const ssLink = 'ss://' + btoa('aes-256-gcm:password@server:8388') + '#Test';
				return new Response(btoa(ssLink), { status: 200 });
			}) as any;

			try {
				const response = await worker.fetch(request, env, ctx);

				// Verify the fetched URL is correct
				expect(fetchedUrl).toBe(targetUrl);

				// Verify the worker used the blacklist mode
				const disposition = response.headers.get('Content-Disposition');
				expect(disposition).toContain('clash-blacklist.yaml');
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it('should handle whitelist mode correctly', async () => {
			const targetUrl = 'https://example.com/sub?token=abc';
			const request = new Request(`http://localhost:8787/whitelist/${targetUrl}`);
			const ctx = createExecutionContext();

			// Mock fetch
			const originalFetch = globalThis.fetch;
			let fetchedUrl = '';
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				fetchedUrl = input.toString();
				// Return a valid SS link
				const ssLink = 'ss://' + btoa('aes-256-gcm:password@server:8388') + '#Test';
				return new Response(btoa(ssLink), { status: 200 });
			}) as any;

			try {
				const response = await worker.fetch(request, env, ctx);

				// Verify the fetched URL is correct
				expect(fetchedUrl).toBe(targetUrl);

				// Verify the worker used the whitelist mode
				const disposition = response.headers.get('Content-Disposition');
				expect(disposition).toContain('clash-whitelist.yaml');
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it('should return 400 if mode prefix is missing', async () => {
			const targetUrl = 'https://example.com/sub';
			// Missing prefix
			const request = new Request(`http://localhost:8787/${targetUrl}`);
			const ctx = createExecutionContext();

			const response = await worker.fetch(request, env, ctx);

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain('Usage:');
			expect(text).toContain('Format: https://worker.domain/{mode}/{v2ray-subscription-url}');
		});

		it('should return 400 if mode prefix is invalid', async () => {
			const targetUrl = 'https://example.com/sub';
			// Invalid prefix
			const request = new Request(`http://localhost:8787/invalid/${targetUrl}`);
			const ctx = createExecutionContext();

			const response = await worker.fetch(request, env, ctx);

			expect(response.status).toBe(400);
		});

		it('should preserve query parameters in the subscription URL', async () => {
			// URL with special characters and query params
			const targetUrl = 'https://example.com/sub?mode=whitelist&token=abc&special=%20';
			const request = new Request(`http://localhost:8787/blacklist/${targetUrl}`);
			const ctx = createExecutionContext();

			// Mock fetch
			const originalFetch = globalThis.fetch;
			let fetchedUrl = '';
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				fetchedUrl = input.toString();
				// Return a valid SS link
				const ssLink = 'ss://' + btoa('aes-256-gcm:password@server:8388') + '#Test';
				return new Response(btoa(ssLink), { status: 200 });
			}) as any;

			try {
				await worker.fetch(request, env, ctx);
				expect(fetchedUrl).toBe(targetUrl);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it('should generate PROXY and Auto proxy groups', async () => {
			const targetUrl = 'https://example.com/sub?token=abc';
			const request = new Request(`http://localhost:8787/blacklist/${targetUrl}`);
			const ctx = createExecutionContext();

			// Mock fetch
			const originalFetch = globalThis.fetch;
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				// Return a valid SS link
				const ssLink = 'ss://' + btoa('aes-256-gcm:password@server:8388') + '#TestNode';
				return new Response(btoa(ssLink), { status: 200 });
			}) as any;

			try {
				const response = await worker.fetch(request, env, ctx);
				const text = await response.text();

				// Verify proxy groups
				expect(text).toContain('name: PROXY');
				expect(text).toContain('type: select');
				expect(text).toContain('proxies:');
				expect(text).toContain('- Auto');
				expect(text).toContain('- TestNode');

				expect(text).toContain('name: Auto');
				expect(text).toContain('type: url-test');
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});
});
