# Component builder
import os, base64

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Written:', path)
