import assert from 'node:assert/strict';
import {
  appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repository = fileURLToPath(new URL('../', import.meta.url));

function withInstallation(check) {
  const temporary = mkdtempSync(path.join(tmpdir(), 'guides-codex-'));
  try {
    const source = path.join(temporary, 'source with spaces');
    const skills = path.join(temporary, 'codex skills');
    const claudeSkills = path.join(temporary, 'claude skills');
    mkdirSync(path.join(source, 'installer'), { recursive: true });
    cpSync(path.join(repository, 'installer/codex.sh'), path.join(source, 'installer/codex.sh'));
    for (const name of ['guides', 'prompts', 'README.md', 'install.md']) {
      cpSync(path.join(repository, name), path.join(source, name), { recursive: true });
    }
    mkdirSync(path.join(claudeSkills, 'project-guides'), { recursive: true });
    const claudeMarker = path.join(claudeSkills, 'project-guides/SKILL.md');
    writeFileSync(claudeMarker, 'preserve Claude installation');

    const run = (args = [], destination = skills) => spawnSync(
      '/bin/sh', [path.join(source, 'installer/codex.sh'), ...args],
      {
        cwd: temporary,
        env: { ...process.env, CODEX_SKILLS_DIR: destination, CLAUDE_SKILLS_DIR: claudeSkills },
        encoding: 'utf8',
      },
    );
    const install = (destination = skills) => {
      const result = run(['--install'], destination);
      assert.equal(result.status, 0, result.stderr);
    };
    check({ temporary, source, skills, run, install });
    assert.equal(readFileSync(claudeMarker, 'utf8'), 'preserve Claude installation');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function installedNames(skills) {
  return readFileSync(path.join(skills, 'project-guides/.installed-skills'), 'utf8')
    .trim().split('\n');
}

function checkSkillLinks(skills, names) {
  for (const name of names) {
    const folder = path.join(skills, name);
    const skill = readFileSync(path.join(folder, 'SKILL.md'), 'utf8');
    assert.match(skill, new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`));
    assert.equal(readFileSync(path.join(folder, 'agents/openai.yaml'), 'utf8'),
      'policy:\n  allow_implicit_invocation: true\n');
    for (const [, target] of skill.matchAll(/\]\(([^)]+)\)/g)) {
      assert.ok(!path.isAbsolute(target), `${name}: absolute link ${target}`);
      assert.ok(existsSync(path.resolve(folder, target.split('#')[0])), `${name}: missing ${target}`);
    }
  }
}

test('installs every prompt and shared document with portable skill links and implicit invocation', () => {
  withInstallation(({ temporary, source, skills, install }) => {
    install();
    const expected = ['project-guides', ...readdirSync(path.join(source, 'prompts'))
      .filter(name => name.endsWith('.md')).map(name => name.replace(/-prompt\.md$/, ''))];
    const names = installedNames(skills);
    assert.deepEqual([...names].sort(), expected.sort());
    assert.equal(new Set(names).size, names.length);
    for (const name of ['guides', 'prompts', 'README.md', 'install.md']) {
      assert.deepEqual(
        spawnSync('diff', ['-r', path.join(source, name), path.join(skills, 'project-guides', name)]).status,
        0, `shared copy differs: ${name}`,
      );
    }
    checkSkillLinks(skills, names);
    const index = readFileSync(path.join(skills, 'project-guides/SKILL.md'), 'utf8');
    assert.match(index, /Mermaid/);
    assert.match(index, /jobw flow/);
    assert.match(index, /\[편집 링크 전달 기준\]\(guides\/diagram-editor-link-guide\.md\)/);
    for (const name of ['guides/diagram-editor-link-guide.md', 'guides/tools/create-editor-link.py']) {
      assert.equal(readFileSync(path.join(skills, 'project-guides', name), 'utf8'),
        readFileSync(path.join(source, name), 'utf8'), `missing editor-link support: ${name}`);
    }
    for (const name of names) {
      const skill = readFileSync(path.join(skills, name, 'SKILL.md'), 'utf8');
      assert.ok(!skill.includes(temporary), `${name}: embeds installation or source path`);
    }
    const moved = path.join(temporary, 'relocated skills');
    renameSync(skills, moved);
    checkSkillLinks(moved, names);
  });
});

test('updates copies, migrates detailed logging, and uninstalls only managed skill names', () => {
  withInstallation(({ source, skills, install, run }) => {
    mkdirSync(path.join(skills, 'unrelated-skill'), { recursive: true });
    const keep = path.join(skills, 'unrelated-skill/SKILL.md');
    writeFileSync(keep, 'keep unrelated skill');
    install();
    const before = installedNames(skills);
    mkdirSync(path.join(skills, 'detailed-logging'));
    writeFileSync(path.join(skills, 'detailed-logging/SKILL.md'), 'old logging skill');
    appendFileSync(path.join(skills, 'project-guides/.installed-skills'), 'detailed-logging\n');
    const prompt = 'prompts/system-design-to-be-prompt.md';
    appendFileSync(path.join(source, prompt), '\nUpdated source content.\n');
    install();
    assert.deepEqual(installedNames(skills), before);
    assert.equal(existsSync(path.join(skills, 'detailed-logging')), false);
    assert.equal(readFileSync(path.join(skills, 'project-guides', prompt), 'utf8'),
      readFileSync(path.join(source, prompt), 'utf8'));

    mkdirSync(path.join(skills, 'retired-prompt'));
    appendFileSync(path.join(skills, 'project-guides/.installed-skills'),
      'retired-prompt\n../claude skills\n.hidden\n');
    const removed = run(['--uninstall']);
    assert.equal(removed.status, 0, removed.stderr);
    for (const name of [...before, 'retired-prompt']) {
      assert.equal(existsSync(path.join(skills, name)), false, `not removed: ${name}`);
    }
    assert.equal(readFileSync(keep, 'utf8'), 'keep unrelated skill');
    assert.equal(run(['--uninstall']).status, 0, 'uninstall should be repeatable');
  });
});

test('supports manifest-free removal and rejects unknown arguments without installing', () => {
  withInstallation(({ skills, run, install }) => {
    assert.equal(run(['--unknown']).status, 1);
    assert.equal(existsSync(skills), false);
    install();
    const names = installedNames(skills);
    rmSync(path.join(skills, 'project-guides/.installed-skills'));
    assert.equal(run(['-u']).status, 0);
    for (const name of names) assert.equal(existsSync(path.join(skills, name)), false);
  });
});
