import struct
import zlib
import os

def create_png(filepath, width, height, r, g, b):
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        return struct.pack(">I", len(data)) + chunk + struct.pack(">I", zlib.crc32(chunk) & 0xffffffff)
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)
    
    raw = b''
    for y in range(height):
        raw += b'\x00' + bytes([r, g, b]) * width
    
    idat = make_chunk(b'IDAT', zlib.compress(raw))
    iend = make_chunk(b'IEND', b'')
    
    with open(filepath, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

base = os.path.join(os.path.dirname(__file__), 'assets')
create_png(os.path.join(base, 'icon.png'), 1024, 1024, 9, 9, 11)
create_png(os.path.join(base, 'splash.png'), 1284, 2778, 9, 9, 11)
create_png(os.path.join(base, 'adaptive-icon.png'), 1024, 1024, 9, 9, 11)
print("Created: icon.png, splash.png, adaptive-icon.png")
