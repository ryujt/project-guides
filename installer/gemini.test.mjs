import assert from 'node:assert/strict';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repository = fileURLToPath(new URL('../', import.meta.url));

function withInstallation(check) {
  const temporary = mkdtempSync(path.join(tmpdir(), 'guides-gemini-'));
  try {
    const source = path.join(temporary, 'source with spaces');
    const home = path.join(temporary, 'home with spaces');
    mkdirSync(path.join(source, 'installer'), { recursive: true });
    mkdirSync(home);
    for (const name of ['gemini.sh', 'codex.sh', 'agent-skills.sh']) {
      cpSync(path.join(repository, 'installer', name), path.join(source, 'installer', name));
    }
    for (const name of ['guides', 'prompts', 'examples', 'README.md', 'install.md']) {
      cpSync(path.join(repository, name), path.join(source, name), { recursive: true });
    }
    const run = (script, args = [], env = {}) => spawnSync(
      '/bin/sh', [path.join(source, 'installer', script), ...args],
      { cwd: temporary, env: { ...process.env, HOME: home, ...env }, encoding: 'utf8' },
    );
    check({ temporary, source, home, run });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function succeeded(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

function installedNames(skills) {
  return readFileSync(path.join(skills, 'project-guides/.installed-skills'), 'utf8')
    .trim().split('\n').sort();
}

test('installs Gemini CLI skills with portable links and without Codex metadata', () => {
  withInstallation(({ temporary, source, home, run }) => {
    const skills = path.join(home, '.gemini/skills');
    mkdirSync(path.join(skills, 'unrelated-skill'), { recursive: true });
    writeFileSync(path.join(skills, 'unrelated-skill/SKILL.md'), 'keep unrelated skill');
    succeeded(run('gemini.sh'));

    const names = ['project-guides', ...readdirSync(path.join(source, 'prompts'))
      .filter(name => name.endsWith('.md')).map(name => name.replace(/-prompt\.md$/, ''))].sort();
    assert.deepEqual(installedNames(skills), names);
    const examples = path.join(skills, 'project-guides/examples');
    for (const name of names) {
      const folder = path.join(skills, name);
      const skill = readFileSync(path.join(folder, 'SKILL.md'), 'utf8');
      assert.match(skill, new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`));
      assert.ok(!skill.includes(temporary), `${name}: embeds installation or source path`);
      assert.equal(existsSync(path.join(folder, 'agents')), false, `${name}: Codex metadata`);
      const targets = [...skill.matchAll(/\]\(([^)]+)\)/g)].map(([, target]) => target);
      for (const target of targets) {
        assert.ok(!path.isAbsolute(target), `${name}: absolute link ${target}`);
        assert.ok(existsSync(path.resolve(folder, target.split('#')[0])), `${name}: missing ${target}`);
      }
      assert.ok(targets.some(target => path.resolve(folder, target.split('#')[0]) === examples),
        `${name}: diagram examples are not discoverable`);
    }
    assert.match(readFileSync(path.join(skills, 'project-guides/SKILL.md'), 'utf8'), /Gemini CLI/);

    succeeded(run('gemini.sh', ['--uninstall']));
    for (const name of names) assert.equal(existsSync(path.join(skills, name)), false, name);
    assert.equal(readFileSync(path.join(skills, 'unrelated-skill/SKILL.md'), 'utf8'), 'keep unrelated skill');
  });
});

test('defers to an existing ~/.agents/skills installation to avoid Gemini skill conflicts', () => {
  withInstallation(({ temporary, home, run }) => {
    const geminiSkills = path.join(home, '.gemini/skills');
    const aliasSkills = path.join(home, '.agents/skills');
    succeeded(run('gemini.sh'));
    assert.ok(existsSync(path.join(geminiSkills, 'project-guides/SKILL.md')));

    succeeded(run('codex.sh'));
    const deferred = run('gemini.sh', ['--install']);
    succeeded(deferred);
    assert.match(deferred.stdout, /건너뜀/);
    assert.equal(existsSync(path.join(geminiSkills, 'project-guides')), false,
      'previous Gemini copy must be removed to avoid duplicate skill names');
    assert.ok(existsSync(path.join(aliasSkills, 'project-guides/SKILL.md')), 'Codex copy must remain');

    const sameAsDefault = run('gemini.sh', [], { GEMINI_SKILLS_DIR: geminiSkills });
    succeeded(sameAsDefault);
    assert.equal(existsSync(path.join(geminiSkills, 'project-guides')), false,
      'naming the default destination explicitly must still avoid duplicates');

    const explicit = path.join(temporary, 'explicit gemini skills');
    succeeded(run('gemini.sh', [], { GEMINI_SKILLS_DIR: explicit }));
    assert.ok(existsSync(path.join(explicit, 'project-guides/SKILL.md')),
      'an explicit destination is installed regardless of the alias');
  });
});

test('rejects unknown and extra arguments without installing', () => {
  withInstallation(({ home, run }) => {
    for (const args of [['--unknown'], ['--install', 'extra']]) {
      assert.equal(run('gemini.sh', args).status, 1, args.join(' '));
    }
    assert.equal(existsSync(path.join(home, '.gemini')), false);
  });
});
