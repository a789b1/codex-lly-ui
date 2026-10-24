from pathlib import Path
import json,re
ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'plugins/codex-lly-ui'
m = json.loads((p/'plugin.json').read_text())
c = json.loads((p/'.codex-plugin/plugin.json').read_text())
assert m['$schema']=='https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
assert m['name']==c['name'] and m['version']==c['version']
i=m['extensions']['com.openai']['interface']
assert i==c['interface'] and len(i['shortDescription'])<=30
for key in ['logo','composerIcon']:
    asset=(p/i[key]).resolve()
    assert asset.is_relative_to(p.resolve()) and asset.is_file()
market=json.loads((ROOT/'.agents/plugins/marketplace.json').read_text())
assert (ROOT/market['plugins'][0]['source']['path']).resolve()==p.resolve()
skill=p/'skills/codex-lly-ui/SKILL.md'
assert skill.read_text().startswith('---\nname: codex-lly-ui\n')
assert 'CLAUDE_SKILL_DIR' not in skill.read_text()
for f in p.rglob('*'):
    assert not f.is_symlink(), f
    if f.suffix=='.md':
        for link in re.findall(r'\]\(([^)]+)\)',f.read_text()):
            if '://' in link or link.startswith('#') or '<' in link: continue
            target=link.split('#')[0]
            if target: assert (f.parent/target).exists(), (f,link)
print('PASS: manifests, marketplace, icons, skill references and package paths')
# Vendored design resources retain source attribution and an integrity manifest.
import hashlib
upstream=skill.parent/'UPSTREAM.json'
u=json.loads(upstream.read_text())
assert len(u['commit'])==40 and u['license']=='MIT'
assert (skill.parent/'UPSTREAM-LICENSE').is_file()
for name,hashes in u['files'].items():
    f=skill.parent/name
    assert f.resolve().is_relative_to(skill.parent.resolve())
    assert hashlib.sha256(f.read_bytes()).hexdigest()==hashes['packagedSha256'], name
assert not (skill.parent/'scripts/oiloil-image.mjs').exists()
assert not (skill.parent/'scripts/check_update.sh').exists()
print('PASS: upstream license, provenance and packaged resource integrity')
