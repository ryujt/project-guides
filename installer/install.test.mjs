import assert from 'node:assert/strict';
import {
  appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repository = fileURLToPath(new URL('../', import.meta.url));

function withInstallation(check, stubChildren = false) {
  const temporary = mkdtempSync(path.join(tmpdir(), 'guides-install-'));
  try {
    const source = path.join(temporary, 'source with spaces');
    const claudeSkills = path.join(temporary, 'claude skills');
    const codexSkills = path.join(temporary, 'codex skills');
    const settings = path.join(temporary, 'settings with spaces.json');
    const log = path.join(temporary, 'children.log');
    mkdirSync(path.join(source, 'installer'), { recursive: true });
    cpSync(path.join(repository, 'installer/install.sh'), path.join(source, 'installer/install.sh'));
    if (!stubChildren) {
      for (const name of ['claude.sh', 'codex.sh']) {
        cpSync(path.join(repository, 'installer', name), path.join(source, 'installer', name));
      }
      for (const name of ['guides', 'prompts', 'README.md', 'install.md']) {
        cpSync(path.join(repository, name), path.join(source, name), { recursive: true });
      }
    }
    const run = (args = []) => spawnSync('/bin/sh', [path.join(source, 'installer/install.sh'), ...args], {
      cwd: temporary,
      env: {
        ...process.env,
        CLAUDE_SKILLS_DIR: claudeSkills,
        CLAUDE_SETTINGS_FILE: settings,
        CODEX_SKILLS_DIR: codexSkills,
        INSTALL_TEST_LOG: log,
      },
      encoding: 'utf8',
    });
    check({ source, claudeSkills, codexSkills, settings, log, run });
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

test('installs and updates both tools, registers one Claude hook, and removes only managed content', () => {
  withInstallation(({ source, claudeSkills, codexSkills, settings, run }) => {
    const unrelatedHook = { hooks: [{ type: 'command', command: 'keep-other-hook' }] };
    const originalSettings = { model: 'preserve-model', hooks: { UserPromptSubmit: [unrelatedHook] } };
    writeFileSync(settings, JSON.stringify(originalSettings));
    for (const skills of [claudeSkills, codexSkills]) {
      mkdirSync(path.join(skills, 'unrelated-skill'), { recursive: true });
      writeFileSync(path.join(skills, 'unrelated-skill/SKILL.md'), 'keep unrelated skill');
    }

    succeeded(run());
    const names = ['project-guides', ...readdirSync(path.join(source, 'prompts'))
      .filter(name => name.endsWith('.md')).map(name => name.replace(/-prompt\.md$/, ''))].sort();
    for (const skills of [claudeSkills, codexSkills]) {
      assert.deepEqual(installedNames(skills), names);
      for (const name of names) assert.ok(existsSync(path.join(skills, name, 'SKILL.md')), `${skills}: ${name}`);
      const index = readFileSync(path.join(skills, 'project-guides/SKILL.md'), 'utf8');
      assert.match(index, /Mermaid/);
      assert.match(index, /jobw flow/);
      assert.match(index, /\[편집 링크 전달 기준\]\(guides\/diagram-editor-link-guide\.md\)/);
      for (const name of ['guides/diagram-editor-link-guide.md', 'guides/tools/create-editor-link.py']) {
        assert.equal(readFileSync(path.join(skills, 'project-guides', name), 'utf8'),
          readFileSync(path.join(source, name), 'utf8'), `${skills}: missing ${name}`);
      }
    }
    assert.ok(existsSync(path.join(claudeSkills, 'project-guides/hooks/skill-trigger.sh')));
    const hook = path.join(claudeSkills, 'project-guides/hooks/skill-trigger.sh');
    for (const [prompt, target] of [
      ['Mermaid 다이어그램을 작성해줘', 'tools-camp-markdown'],
      ['jobw flow 다이어그램을 작성해줘', 'job-flow-diagram'],
      ['편집 링크를 만들어줘', 'diagram-editor-link'],
    ]) {
      const triggered = spawnSync('/bin/sh', [hook], { input: JSON.stringify({ prompt }), encoding: 'utf8' });
      succeeded(triggered);
      assert.ok(triggered.stdout.includes(`/project-guides ${target}`), `${prompt}: ${triggered.stdout}`);
    }
    assert.equal(readFileSync(path.join(codexSkills, 'project-guides/agents/openai.yaml'), 'utf8'),
      'policy:\n  allow_implicit_invocation: true\n');

    const prompt = 'prompts/frontend-prototype-prompt.md';
    appendFileSync(path.join(source, prompt), '\nUpdated prototype guidance.\n');
    succeeded(run(['--install']));
    for (const skills of [claudeSkills, codexSkills]) {
      assert.equal(readFileSync(path.join(skills, 'project-guides', prompt), 'utf8'),
        readFileSync(path.join(source, prompt), 'utf8'));
    }
    const updatedSettings = JSON.parse(readFileSync(settings, 'utf8'));
    assert.equal(updatedSettings.model, originalSettings.model);
    assert.deepEqual(updatedSettings.hooks.UserPromptSubmit[0], unrelatedHook);
    const ownedHooks = updatedSettings.hooks.UserPromptSubmit.flatMap(group => group.hooks)
      .filter(hook => hook.command.includes('project-guides/hooks/skill-trigger.sh'));
    assert.equal(ownedHooks.length, 1, 'reinstall must not duplicate the Claude hook');
    assert.equal(ownedHooks[0].command,
      `"${path.join(claudeSkills, 'project-guides/hooks/skill-trigger.sh')}"`);

    const checkRemoved = () => {
      for (const skills of [claudeSkills, codexSkills]) {
        for (const name of names) assert.equal(existsSync(path.join(skills, name)), false, `${skills}: ${name}`);
        assert.equal(readFileSync(path.join(skills, 'unrelated-skill/SKILL.md'), 'utf8'), 'keep unrelated skill');
      }
      assert.deepEqual(JSON.parse(readFileSync(settings, 'utf8')), originalSettings);
    };
    succeeded(run(['--uninstall']));
    checkRemoved();
    succeeded(run());
    succeeded(run(['-u']));
    checkRemoved();
  });
});

test('rejects unknown and extra arguments before either installer runs', () => {
  withInstallation(({ source, claudeSkills, codexSkills, settings, log, run }) => {
    for (const name of ['claude.sh', 'codex.sh']) {
      writeFileSync(path.join(source, 'installer', name), '#!/bin/sh\nprintf "called\\n" >> "$INSTALL_TEST_LOG"\n');
    }
    for (const args of [[''], ['--unknown'], ['--install', 'extra'], ['--uninstall', '--install']]) {
      assert.equal(run(args).status, 1, args.join(' '));
      assert.equal(existsSync(log), false, 'invalid arguments must not reach an installer');
    }
    for (const file of [claudeSkills, codexSkills, settings]) assert.equal(existsSync(file), false);
  }, true);
});

test('propagates child failures and stops before the next installer', () => {
  withInstallation(({ source, log, run }) => {
    const child = (name, status) => {
      writeFileSync(path.join(source, 'installer', `${name}.sh`),
        `#!/bin/sh\nprintf '%s\\n' '${name}' >> "$INSTALL_TEST_LOG"\nexit ${status}\n`);
    };
    child('claude', 23);
    child('codex', 0);
    assert.equal(run(['--install']).status, 23);
    assert.equal(readFileSync(log, 'utf8'), 'claude\n');

    rmSync(log);
    child('claude', 0);
    child('codex', 31);
    assert.equal(run(['--install']).status, 31);
    assert.equal(readFileSync(log, 'utf8'), 'claude\ncodex\n');
  }, true);
});
