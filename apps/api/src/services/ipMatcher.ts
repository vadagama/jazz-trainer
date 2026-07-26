/**
 * Minimal IPv4 CIDR matcher — no external deps.
 *
 * Accepts individual IPs (e.g. "192.168.1.1") and CIDR ranges
 * (e.g. "10.0.0.0/8", "172.16.0.0/12").
 */

function ipToInt(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) throw new Error(`Invalid IP: ${ip}`);
  return (
    ((+parts[0]! & 0xff) << 24) |
    ((+parts[1]! & 0xff) << 16) |
    ((+parts[2]! & 0xff) << 8) |
    (+parts[3]! & 0xff)
  ) >>> 0;
}

interface Net {
  base: number;
  mask: number;
}

function parseNet(cidr: string): Net {
  const [ip, bits] = cidr.includes('/') ? cidr.split('/') : [cidr, '32'];
  const base = ipToInt(ip!);
  const mask = ~((1 << (32 - +bits!)) - 1) >>> 0;
  return { base: base & mask, mask };
}

export function createCIDRMatcher(allowed: string[]): (ip: string) => boolean {
  const nets = allowed.map(parseNet);
  return (ip: string) => {
    let addr: number;
    try {
      addr = ipToInt(ip);
    } catch {
      return false;
    }
    for (const net of nets) {
      if ((addr & net.mask) === net.base) return true;
    }
    return false;
  };
}
