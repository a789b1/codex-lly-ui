from pathlib import Path
import zipfile,subprocess,sys,json
root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'scripts/validate.py')],check=True)
p=root/'plugins/codex-lly-ui'
version=json.loads((p/'plugin.json').read_text())['version']
out=root/('dist/codex-lly-ui-'+version+'.zip')
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(p.rglob('*')):
        if f.is_file() and '__pycache__' not in f.parts and f.suffix!='.pyc':
            z.write(f,f.relative_to(p))
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    assert 'plugin.json' in z.namelist() and 'skills/codex-lly-ui/SKILL.md' in z.namelist()
print(out)
