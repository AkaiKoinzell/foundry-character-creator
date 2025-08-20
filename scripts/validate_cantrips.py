#!/usr/bin/env python3
import json
import glob
import sys

def main():
    try:
        with open('data/spells.json', 'r') as f:
            spells = json.load(f)
    except FileNotFoundError:
        print('spells.json not found')
        return 1

    spells_by_name = {spell['name']: spell for spell in spells}

    missing = []
    level_mismatch = []
    class_mismatch = []

    for path in glob.glob('data/classes/*.json'):
        with open(path, 'r') as f:
            cls = json.load(f)
        cls_name = cls.get('name', path)
        for choice in cls.get('choices', []):
            if choice.get('type') == 'cantrips' or choice.get('name', '').lower().startswith('cantrip'):
                for spell_name in choice.get('selection', []):
                    spell = spells_by_name.get(spell_name)
                    if not spell:
                        missing.append((cls_name, spell_name))
                        continue
                    if spell.get('level') != 0:
                        level_mismatch.append((cls_name, spell_name, spell.get('level')))
                    if cls_name not in spell.get('spell_list', []):
                        class_mismatch.append((cls_name, spell_name))

    if missing or level_mismatch or class_mismatch:
        if missing:
            print('Missing spells:')
            for cls_name, spell_name in missing:
                print(f'  {cls_name}: {spell_name}')
        if level_mismatch:
            print('Non-cantrip spells referenced:')
            for cls_name, spell_name, level in level_mismatch:
                print(f'  {cls_name}: {spell_name} (level {level})')
        if class_mismatch:
            print('Class not in spell_list:')
            for cls_name, spell_name in class_mismatch:
                print(f'  {cls_name}: {spell_name}')
        return 1
    print('All class cantrip selections are present in spells.json')
    return 0

if __name__ == '__main__':
    sys.exit(main())
