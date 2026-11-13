"""Tekent het app-icoon (oranje vlak met een wit 'geluid'-symbool) zonder extra pakketten."""
import math
import os
import struct
import zlib

BG = (232, 89, 12)
FG = (255, 255, 255)


def coverage(dist, edge):
    """1 binnen de vorm, 0 erbuiten, met een zachte rand van ~1 pixel."""
    return max(0.0, min(1.0, 0.5 - dist / edge))


def pixel(x, y, px):
    cx, cy = 0.30, 0.5
    dx, dy = x - cx, y - cy
    r = math.hypot(dx, dy)
    a = coverage(r - 0.105, px)  # de stip
    ang = abs(math.degrees(math.atan2(dy, dx)))
    for radius in (0.24, 0.38, 0.52):  # drie geluidsgolven
        ring = abs(r - radius) - 0.036
        side = (ang - 48) * math.pi / 180 * r  # afstand tot de rand van de boog
        a = max(a, coverage(max(ring, side), px))
    return tuple(round(BG[i] + (FG[i] - BG[i]) * a) for i in range(3))


def png(size, path):
    rows = bytearray()
    for j in range(size):
        rows.append(0)
        for i in range(size):
            rows.extend(pixel((i + 0.5) / size, (j + 0.5) / size, 1.0 / size))

    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(bytes(rows), 9)))
        f.write(chunk(b'IEND', b''))


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'icons')
    os.makedirs(out, exist_ok=True)
    for s in (180, 512):
        png(s, os.path.join(out, f'icon-{s}.png'))
    print('icons written to', out)
