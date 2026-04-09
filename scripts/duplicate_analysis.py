import json
import re
from pathlib import Path
from unicodedata import normalize as unorm


def norm(text=''):
    t = str(text or '')
    t = unorm('NFKD', t)
    t = re.sub(r'\p{M}+', '', t, flags=re.UNICODE)
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'[“”‘’«»"\'`]', '', t)
    t = re.sub(r'[–—_]', '-', t)
    t = re.sub(r'[.,;:!?()\[\]{}]', '', t)
    t = re.sub(r'\s*[-–—]\s*', ' - ', t)
    return t.strip().lower()


def norm_artist(artist=''):
    a = norm(artist)
    a = re.sub(r'^(el|la|los|las)\s+', '', a)
    a = re.sub(r'\bmariachi\b\s*', '', a)
    return re.sub(r'\s+', ' ', a).strip()


excel = json.loads(Path('docs/excel_normalized.json').read_text(encoding='utf-8'))
firestore = json.loads(Path('docs/firebase_songs.json').read_text(encoding='utf-8'))


def stats(arr, name, fns):
    counts = {}
    for item in arr:
        key = '___'.join(fn(item) for fn in fns)
        counts[key] = counts.get(key, 0) + 1
    dups = [(k, v) for k, v in counts.items() if v > 1]
    print(f'{name}: total={len(arr)}, unique={len(counts)}, duplicates={len(dups)}')
    if dups:
        print('  sample', dups[:10])


stats(excel, 'Excel titles', [lambda item: norm(item['normalizedTitle'])])
stats(excel, 'Excel artists', [lambda item: norm_artist(item['normalizedArtist'])])
stats(excel, 'Excel title+artist', [lambda item: norm(item['normalizedTitle']), lambda item: norm_artist(item['normalizedArtist'])])

fs_inputs = []
for item in firestore:
    title = norm(item.get('title', ''))
    artist = norm_artist(item.get('artist', ''))
    occasions = [norm(o) for o in item.get('occasions') or []]
    fs_inputs.append({'title': title, 'artist': artist, 'occasions': occasions, 'youtubeUrl': item.get('youtubeUrl', ''), 'link': item.get('link', '')})

stats(fs_inputs, 'Firestore titles', [lambda item: item['title']])
stats(fs_inputs, 'Firestore artists', [lambda item: item['artist']])
stats(fs_inputs, 'Firestore title+artist', [lambda item: item['title'], lambda item: item['artist']])

print('')

excel_cats = set()
for item in excel:
    for cat in item.get('normalizedCategories', []):
        excel_cats.add(norm(cat))

fs_cats = set()
for item in fs_inputs:
    for cat in item.get('occasions', []):
        fs_cats.add(norm(cat))

print('Excel normalized category count', len(excel_cats), sorted(excel_cats))
print('Firestore normalized category count', len(fs_cats), sorted(fs_cats))
