# V2Ray to Clash Converter

A Cloudflare Worker that converts V2Ray subscription links to Clash configuration format.

## Usage

### URL Format

```
https://worker.domain/{mode}/{v2ray-subscription-url}
```

### Modes

- **whitelist**: Only proxy blocked domains (Recommended).
- **blacklist**: Proxy everything except CN domains.

### Examples

**Whitelist Mode (Recommended)**
```
https://worker.domain/whitelist/https://example.com/sub?token=123
```

**Blacklist Mode**
```
https://worker.domain/blacklist/https://example.com/sub?token=123
```

### Output

- Returns a standard Clash YAML configuration.
- Includes `PROXY` and `Auto` proxy groups.
- Caches results for 5 minutes.
