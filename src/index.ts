/**
 * V2Ray to Clash Converter Worker
 *
 * Converts V2Ray subscription links to Clash configuration format
 */

import yaml from 'js-yaml';
import { defaultConfig, getRulesByMode } from './config';
import { convertSubscription } from './parsers';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url);

			// Strict path-based parameter separation
			// Format: https://worker.domain/{mode}/{subscription_url}
			// Example: https://worker.domain/blacklist/https://example.com/sub?token=123

			let path = url.pathname.slice(1); // Remove leading slash
			let mode = '';
			let v2rayUrl: string;

			// Check for mode prefix
			if (path.startsWith('blacklist/')) {
				mode = 'blacklist';
				path = path.slice('blacklist/'.length);
			} else if (path.startsWith('whitelist/')) {
				mode = 'whitelist';
				path = path.slice('whitelist/'.length);
			}

			if (!mode || !path) {
				return new Response('Bad Request', {
					status: 400,
					headers: { 'Content-Type': 'text/plain; charset=utf-8' },
				});
			}

			// Construct the full V2Ray subscription URL
			// We append the query string from the original request to the path
			// This allows users to paste the full URL including query params
			const queryString = url.search;
			v2rayUrl = path + queryString;

			console.log('Fetching V2Ray subscription:', v2rayUrl);
			console.log('Rule mode:', mode);

			// Fetch the V2Ray subscription
			const response = await fetch(v2rayUrl, {
				headers: {
					'User-Agent': 'ClashConverter/1.0',
				},
			});

			if (!response.ok) {
				return new Response(`Failed to fetch subscription: ${response.status} ${response.statusText}`, {
					status: 502,
					headers: { 'Content-Type': 'text/plain; charset=utf-8' },
				});
			}

			// Get the subscription content
			const subscriptionData = await response.text();

			// Decode base64-encoded subscription
			let decodedContent: string;
			try {
				decodedContent = atob(subscriptionData);
			} catch (error) {
				// If it's not base64, assume it's already decoded
				decodedContent = subscriptionData;
			}

			// Convert V2Ray links to Clash proxies
			const proxies = convertSubscription(decodedContent);

			if (proxies.length === 0) {
				return new Response('No valid proxies found in subscription', {
					status: 400,
					headers: { 'Content-Type': 'text/plain; charset=utf-8' },
				});
			}

			// Create the Clash configuration with selected rules
			const proxyNames = proxies.map((p) => p.name);
			const clashConfig = {
				...defaultConfig,
				proxies: proxies,
				'proxy-groups': [
					{
						name: 'PROXY',
						type: 'select',
						proxies: proxyNames,
					}
				],
				rules: getRulesByMode(mode),
			};

			// Convert to YAML using js-yaml
			const yamlString = yaml.dump(clashConfig, {
				indent: 2,
				lineWidth: -1, // Don't wrap lines
				noRefs: true, // Don't use anchors/aliases
			});

			// Return YAML response
			return new Response(yamlString, {
				status: 200,
				headers: {
					'Content-Type': 'application/x-yaml; charset=utf-8',
					'Content-Disposition': `attachment; filename="clash-${mode}.yaml"`,
					'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
				},
			});
		} catch (error) {
			console.error('Worker error:', error);
			return new Response(`Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
				status: 500,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' },
			});
		}
	},
} satisfies ExportedHandler<Env>;

