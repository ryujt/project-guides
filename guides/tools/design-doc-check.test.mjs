// design-doc-check.test.mjs — design-doc-check.mjs 테스트(node:test·의존성 없음·Node 18+)
// 임시 폴더에 가상 문서(주문·결제·배송 같은 가상 이름)를 만들어 검사 코드마다 걸리는 최소 사례와 통과 사례를 확인한다.
// 실행: node --test guides/tools/design-doc-check.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main, slug, Slugger, headingText, parseMarkdown } from './design-doc-check.mjs';

const TOOL = fileURLToPath(new URL('./design-doc-check.mjs', import.meta.url));
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'design-doc-check-test-'));
process.on('exit', () => fs.rmSync(ROOT, { recursive: true, force: true }));

let seq = 0;
/** { '상대 경로': 줄 배열 | 문자열 }로 임시 폴더를 만든다. */
function fixture(files) {
  seq += 1;
  const dir = path.join(ROOT, `case-${String(seq).padStart(2, '0')}`);
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, Array.isArray(body) ? `${body.join('\n')}\n` : body);
  }
  return dir;
}

/** dir를 git 저장소로 만든다 — git이 있으면 git init, 없거나 실패하면 빈 .git 폴더(도구는 .git이 있는지만 본다). */
function gitInit(dir) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))); // 훅 안에서 돌아도 dir에 만든다
  spawnSync('git', ['init', '-q', dir], { encoding: 'utf8', env });
  if (!fs.existsSync(path.join(dir, '.git'))) fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
}

/** dir나 그 위 폴더에 .git이 있는가 — 임시 폴더가 저장소 안이면 'git 없는 폴더' 사례를 만들 수 없다. */
function insideGit(dir) {
  for (let d = dir; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) return true;
    if (path.dirname(d) === d) return false;
  }
}

/** dir가 대소문자를 구분하지 않는 파일 시스템(macOS·Windows 기본)에 있는가 — 'CaseProbe'를 만들고 'caseprobe'로 찾는다. */
function caseInsensitive(dir) {
  const probe = path.join(dir, 'CaseProbe');
  fs.mkdirSync(probe, { recursive: true });
  try {
    return fs.existsSync(path.join(dir, 'caseprobe'));
  } finally {
    fs.rmSync(probe, { recursive: true, force: true });
  }
}
const NOCASE = caseInsensitive(ROOT);

const jf = (...body) => ['```jobflow', ...body, '```', ''];
const mm = (...body) => ['```mermaid', ...body, '```', ''];

/** 줄 배열에서 needle과 똑같은 nth 번째 줄의 번호(1부터). */
function lineOf(lines, needle, nth = 1) {
  let k = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === needle) {
      k += 1;
      if (k === nth) return i + 1;
    }
  }
  throw new Error(`fixture에 없는 줄: ${needle}`);
}

/** main()을 프로세스 안에서 돌리고 출력을 나눠 돌려준다. */
async function run(...args) {
  const out = [];
  const err = [];
  const code = await main(args, { out: (s) => out.push(s), err: (s) => err.push(s) });
  const issues = [];
  for (const l of out) {
    const m = /^(FAIL|WARN) (\S+) (.+?):(\d+) (.*)$/.exec(l);
    if (m) issues.push({ level: m[1], code: m[2], file: path.basename(m[3]), line: Number(m[4]), msg: m[5] });
  }
  return { code, out, err, issues, last: out[out.length - 1] };
}

const checkDoc = (lines, ...opts) => run(...opts, fixture({ 'doc.md': lines }));
const pick = (r, code) => r.issues.filter((i) => i.code === code);
const brief = (r) => r.issues.map((i) => `${i.level} ${i.code} ${i.line}`);
const dump = (r) => [...r.out, ...r.err].join('\n');

/* ------------------------------------------------------------ 슬러그 */

test('슬러그 — GitHub 방식(소문자·기호 제거·공백→하이픈·결합 문자 유지)', () => {
  assert.equal(slug('4. 흐름 절 — 경계 수준 jobflow'), '4-흐름-절--경계-수준-jobflow');
  assert.equal(slug('3.1 절 번호표'), '31-절-번호표');
  assert.equal(slug('7. ID와 교차 참조'), '7-id와-교차-참조');
  assert.equal(slug('주문·결제 흐름'), '주문결제-흐름');
  assert.equal(slug('API_v2 (초안)'), 'api_v2-초안');
  assert.equal(slug('Cafe\u0301 메뉴'), 'cafe\u0301-메뉴'); // e + 결합 부호(U+0301)는 남는다
});

test('제목 텍스트 — 코드 스팬은 내용, 링크·이미지는 텍스트만, 닫는 #은 뺀다', () => {
  assert.equal(slug(headingText('`Order.place` 흐름')), 'orderplace-흐름');
  assert.equal(headingText('[배송 규칙](rules.md) 요약'), '배송 규칙 요약');
  assert.equal(headingText('![그림](a.png) 배치 ##'), '그림 배치');
  assert.equal(slug(headingText('_가상_ 예시 &amp; 범위')), '가상-예시--범위');
  assert.equal(slug(headingText('`<boundary>` 상세')), 'boundary-상세');
  assert.equal(slug(headingText('주문&nbsp;결제')), '주문결제'); // U+00A0은 공백이 아니라 지워진다
  assert.equal(slug(headingText('<https://example.com> 안내 <br/>')), 'httpsexamplecom-안내');
});

test('중복 제목 슬러그 — 같은 제목은 -1, -2를 붙인다', async () => {
  const s = new Slugger();
  assert.deepEqual(['개요', '개요', '개요'].map((t) => s.slug(t)), ['개요', '개요-1', '개요-2']);
  const t = new Slugger();
  assert.deepEqual(['a', 'a-1', 'a'].map((x) => t.slug(x)), ['a', 'a-1', 'a-2']);

  const ls = ['# 문서', '', '## 개요', '', '## 개요', '', '[둘째 개요](#개요-1)', '[셋째 개요](#개요-2)', ''];
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [`FAIL ANCHOR ${lineOf(ls, '[셋째 개요](#개요-2)')}`]);
});

test('슬러그 — ZWNJ·ZWJ(U+200C·U+200D)는 github-slugger처럼 지운다', () => {
  assert.equal(slug('주문‌결제 흐름'), '주문결제-흐름');
  assert.equal(slug('배송‍알림'), '배송알림');
});

test('한계 — 목록 표지와 같은 줄의 ATX 제목과 4칸 이상 들여 쓴 제목은 모으지 않는다', async () => {
  const ls = [
    '# 문서', '',
    '- ## 목록 안 제목', '1. ### 번호 목록 안 제목', '- 항목', '  ## 이어진 줄 제목', '',
    '    ## 네 칸 제목', '',
    '[목록 안](#목록-안-제목)·[이어진 줄](#이어진-줄-제목)', '',
  ];
  assert.deepEqual(parseMarkdown(`${ls.join('\n')}\n`).headings.map((h) => h.text), ['문서', '이어진 줄 제목']);
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [`FAIL ANCHOR ${lineOf(ls, '[목록 안](#목록-안-제목)·[이어진 줄](#이어진-줄-제목)')}`]);
});

/* ------------------------------------------------------------ 펜스 */

test('FENCE — 닫히지 않은 펜스', async () => {
  const r = await checkDoc(['# 문서', '', '```js', 'const order = 1;', '']);
  assert.equal(r.code, 1);
  assert.deepEqual(brief(r), ['FAIL FENCE 3']);
});

test('FENCE — 열린 펜스 안의 여는 펜스 모양 줄', async () => {
  const r = await checkDoc(['```text', '```js', 'order()', '```', '']);
  assert.deepEqual(brief(r), ['FAIL FENCE 2']);
});

test('FENCE — 긴 펜스 안 짧은 펜스·물결 펜스·0~3칸 들여쓰기는 짝이 맞고 안의 제목은 빠진다', async () => {
  const ls = [
    '````markdown', '```jobflow', '안쪽 예시는 검사하지 않는다', '```', '````', '',
    '~~~', '## 펜스 안 제목', '~~~', '',
    '   ```js', '   order()', '   ```', '',
    '    ```js', '    4칸 들여쓰기는 펜스가 아니다(들여쓰기 코드)', '',
    '[아래](#펜스-밖-제목)', '',
    '## 펜스 밖 제목', '',
  ];
  const r = await checkDoc(ls);
  assert.equal(r.code, 0, dump(r));
  assert.deepEqual(brief(r), []);
  assert.equal(r.last, 'files=1 blocks=0 fail=0 warn=0');
  assert.deepEqual(parseMarkdown(`${ls.join('\n')}\n`).headings.map((h) => h.text), ['펜스 밖 제목']);
});

test('FENCE — 인용(>) 안 펜스는 짝·내용을 보지 않는다', async () => {
  const ls = [
    '> 잘못된 예:', '>', '> ```jobflow', '> Order.place --> Payment.charge', '> [깨진 링크](missing.md)', '',
    '> ```js', '> order()', '> ```', '',
    '## 다음 절', '', '[다음](#다음-절)', '',
  ];
  const r = await checkDoc(ls);
  assert.equal(r.code, 0, dump(r));
  assert.equal(r.last, 'files=1 blocks=0 fail=0 warn=0');
});

test('인라인 ```chart-line 함정 — 줄 맨 앞 펜스만 펜스로 보므로 뒤 제목이 살아 있다', async () => {
  const ls = [
    '# 차트 안내', '',
    '차트는 ```` ```chart-line ```` 블록으로 그린다.',
    '```chart-line```으로 시작하는 줄도 인라인 코드다.',
    '줄 중간의 ```chart-line은 닫는 백틱이 없어도 펜스가 아니다.', '',
    '## 뒤 제목', '',
    '[뒤 제목으로](#뒤-제목)', '',
  ];
  const r = await checkDoc(ls);
  assert.equal(r.code, 0, dump(r));
  assert.deepEqual(brief(r), []);
  assert.deepEqual(parseMarkdown(`${ls.join('\n')}\n`).headings.map((h) => h.slug), ['차트-안내', '뒤-제목']);
});

/* ------------------------------------------------------------ jobflow */

test('JF-HEADER — 헤더 없음·대문자 헤더·이름 속 -->·두 번째 헤더는 FAIL, master:는 WARN', async () => {
  const ls = [
    ...jf('Object: Order, Payment', 'Order.place --> Payment.charge'),
    ...jf('Scope: 주문', 'Object: Order, Payment', 'Order.place --> Payment.charge'),
    ...jf('scope: 주문 --> 결제', 'Object: Order, Payment', 'Order.place --> Payment.charge'),
    ...jf('scope: 주문', 'Object: Order, Payment', 'orchestrator: Order', 'Order.place --> Payment.charge'),
    ...jf('master: Order', 'Object: Order, Payment', 'Order.place --> Payment.charge'),
    ...jf('orchestrator: Checkout', 'Object: Order, Payment', 'Order.place --> Payment.charge'),
  ];
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [
    `FAIL JF-HEADER ${lineOf(ls, 'Object: Order, Payment')}`,
    `FAIL JF-HEADER ${lineOf(ls, 'Scope: 주문')}`,
    `FAIL JF-HEADER ${lineOf(ls, 'scope: 주문 --> 결제')}`,
    `FAIL JF-HEADER ${lineOf(ls, 'orchestrator: Order')}`,
    `WARN JF-HEADER ${lineOf(ls, 'master: Order')}`,
    `WARN JF-HEADER ${lineOf(ls, 'orchestrator: Checkout')}`,
  ]);
  assert.match(pick(r, 'JF-HEADER').at(-1).msg, /^Object: 목록에 없는 orchestrator 이름 'Checkout'$/);
});

test('JF-OBJECT — Object: 줄 없음·화살표와 단독(분기) 줄의 미선언 객체', async () => {
  const ls = [
    ...jf('scope: 주문', 'Order.place --> Payment.charge'),
    ...jf('scope: 주문', 'Object: Order', 'Order.place --> Payment.charge'),
    ...jf('scope: 주문', 'Object: Order, Payment', 'Order.place --> Payment.charge', 'Stock.reserve.true'),
  ];
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [
    'FAIL JF-OBJECT 1',
    `FAIL JF-OBJECT ${lineOf(ls, 'Order.place --> Payment.charge', 2)}`,
    `FAIL JF-OBJECT ${lineOf(ls, 'Stock.reserve.true')}`,
  ]);
  assert.match(pick(r, 'JF-OBJECT')[1].msg, /'Payment'/);
  assert.match(pick(r, 'JF-OBJECT')[2].msg, /'Stock'/);
});

test('JF-OBJECT — 렌더러가 못 읽는 줄: 들여 쓴 Object:·화살표 둘·->·객체 뒤 공백·선언 전 분기·액션 없음', async () => {
  const ls = [
    ...jf('scope: 주문', '  Object: Order, Payment', 'Order.place --> Payment.charge'),
    ...jf('scope: 주문', 'Object: Order, Payment, Ledger', 'Order.place --> Payment.charge --> Ledger.record'),
    ...jf('scope: 주문', 'Object: Order, Payment', 'Order.place -> Payment.charge', 'Order .confirm --> Payment.capture'),
    ...jf('scope: 주문', 'Order.check.true', 'Object: Order, Payment', 'Order.place --> Payment'),
  ];
  const r = await checkDoc(ls);
  assert.deepEqual(pick(r, 'JF-OBJECT').map((i) => `${i.level} ${i.line}`), [
    `FAIL ${lineOf(ls, '  Object: Order, Payment')}`,
    `FAIL ${lineOf(ls, 'Order.place --> Payment.charge --> Ledger.record')}`,
    `FAIL ${lineOf(ls, 'Order.place -> Payment.charge')}`,
    `FAIL ${lineOf(ls, 'Order .confirm --> Payment.capture')}`,
    `FAIL ${lineOf(ls, 'Order.check.true')}`,
    `FAIL ${lineOf(ls, 'Order.place --> Payment')}`,
  ]);
});

test('JF-UNUSED — 선언했지만 쓰지 않은 객체', async () => {
  const ls = jf('scope: 주문', 'Object: Order, Payment, Ledger', 'Order.place --> Payment.charge');
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [`WARN JF-UNUSED ${lineOf(ls, 'Object: Order, Payment, Ledger')}`]);
  assert.match(r.issues[0].msg, /'Ledger'/);
  assert.equal(r.code, 0);
});

test('JF-LABEL — 화살표 줄·단독 줄의 콜론은 공백이 없어도 FAIL, ::만 예외', async () => {
  const ls = jf('scope: 주문', 'Object: Order, Payment',
    'Order.place --> Payment.charge : 결제 요청',
    'Payment.charge.result --> Order.Gateway::confirm',
    'Order.confirm --> Payment.capture:즉시',
    'Payment.capture.ok:메모');
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [
    `FAIL JF-LABEL ${lineOf(ls, 'Order.place --> Payment.charge : 결제 요청')}`,
    `FAIL JF-LABEL ${lineOf(ls, 'Order.confirm --> Payment.capture:즉시')}`,
    `FAIL JF-LABEL ${lineOf(ls, 'Payment.capture.ok:메모')}`,
  ]);
});

test('JF-NAME — 객체 이름의 공백은 WARN(렌더러는 읽는다), 빈 이름·"."·중복 선언도 WARN', async () => {
  const ls = jf('scope: 주문', 'Object: Order Desk, Payment', 'Order Desk.place --> Payment.charge');
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [`WARN JF-NAME ${lineOf(ls, 'Object: Order Desk, Payment')}`]);
  assert.equal(r.code, 0);

  const ls2 = jf('scope: 주문', 'Object: Order, Payment, , Pay.ment, Order', 'Order.place --> Payment.charge');
  const r2 = await checkDoc(ls2);
  const at = lineOf(ls2, 'Object: Order, Payment, , Pay.ment, Order');
  assert.deepEqual(brief(r2), [`WARN JF-NAME ${at}`, `WARN JF-NAME ${at}`, `WARN JF-NAME ${at}`, `WARN JF-UNUSED ${at}`]);
  assert.match(pick(r2, 'JF-UNUSED')[0].msg, /'Pay\.ment'/);
});

test('JF-ONNAME — oneShotSession·online은 WARN, onTick·OnTick·on_close·on200·On취소요청은 통과', async () => {
  const ls = jf('scope: 세션', 'Object: Client, Session',
    'Client.oneShotSession --> Session.open',
    'Session.onTick --> Client.refresh',
    'Session.OnTick --> Client.redraw',
    'Client.on_close --> Session.close',
    'Client.on200 --> Session.accept',
    'Client.On취소요청 --> Session.cancel',
    'Client.online --> Session.ping');
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [
    `WARN JF-ONNAME ${lineOf(ls, 'Client.oneShotSession --> Session.open')}`,
    `WARN JF-ONNAME ${lineOf(ls, 'Client.online --> Session.ping')}`,
  ]);
  assert.match(r.issues[0].msg, /'eShotSession'/);

  const pass = await checkDoc(jf('scope: 시계', 'Object: Clock, Job', 'Clock.onTick --> Job.run', 'Clock.OnTick --> Job.check'));
  assert.deepEqual(brief(pass), []);
});

test('JF-RETURN — orchestrator로 돌아오는 같은 타깃 2회는 WARN, scope·qualifier 타깃은 세지 않는다', async () => {
  const body = [
    'Object: Checkout, Payment, Mailer',
    'Checkout.place --> Payment.charge',
    'Payment.charge.result --> Checkout.confirm',
    'Checkout.confirm --> Mailer.send',
    'Mailer.send.result --> Checkout.confirm',
  ];
  const ls = [
    ...jf('orchestrator: Checkout', ...body),
    ...jf('scope: 결제', ...body),
    ...jf('orchestrator: Checkout', 'Object: Checkout, Payment',
      'Checkout.place --> Payment.charge',
      'Payment.charge.result --> Checkout.confirm.done',
      'Payment.refund.result --> Checkout.confirm.done'),
  ];
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [`WARN JF-RETURN ${lineOf(ls, 'Mailer.send.result --> Checkout.confirm')}`]);
  assert.match(r.issues[0].msg, /2번/);
});

/* ------------------------------------------------- jobflow 다시 그리기 */

// 렌더러는 출발 노드 칸 아래 같은 열에 다른 칸이 먼저 생기면 그 노드를 이어 쓰지 못하고 새 칸에 다시 그린다.
// 아래 사례의 끊김·이어짐은 렌더러 사본으로 그린 PNG에서 눈으로 확인했다.

test('JF-REDRAW — 팬아웃 형제가 같은 열을 먼저 차지하면 하류 출발 노드를 다시 그리고, 깊이 우선이면 이어진다', async () => {
  const head = ['scope: 주문 결제', 'Object: Browser, Shop, Payment, Bank', 'Browser.checkout --> Shop.placeOrder', 'Shop.placeOrder --> Payment.card'];
  const ls = [
    ...jf(...head, 'Shop.placeOrder --> Payment.point', 'Payment.card --> Bank.approve'), // 끊김
    ...jf(...head, 'Payment.card --> Bank.approve', 'Shop.placeOrder --> Payment.point'), // 깊이 우선 — 이어짐
  ];
  const r = await checkDoc(ls);
  const made = lineOf(ls, 'Shop.placeOrder --> Payment.card');
  assert.deepEqual(brief(r), [`WARN JF-REDRAW ${lineOf(ls, 'Payment.card --> Bank.approve')}`]);
  assert.equal(r.issues[0].msg,
    `출발 노드 'Payment.card' — 줄 ${made}에서 그린 칸 아래 같은 열에 'Payment.point'(줄 ${lineOf(ls, 'Shop.placeOrder --> Payment.point')}) 칸이 먼저 생겨 `
    + `렌더러가 이 노드를 새 칸에 다시 그린다(흐름이 끊긴다). 이 노드에서 나가는 줄을 줄 ${made} 바로 뒤로 옮긴다(깊이 우선)`);
  assert.equal(r.code, 0); // WARN이다
});

test('JF-REDRAW — 팬아웃 중 콜백이 출발점 열에 칸을 만들면 출발점을 다시 그리고, 팬아웃을 먼저 끝내면 이어진다', async () => {
  const ls = [
    ...jf('scope: 주문 확정', 'Object: Shop, Payment, Stock',
      'Shop.confirm --> Payment.charge', 'Payment.OnCharged --> Shop.markPaid', 'Shop.confirm --> Stock.reserve'),
    ...jf('scope: 주문 확정', 'Object: Shop, Payment, Stock',
      'Shop.confirm --> Payment.charge', 'Shop.confirm --> Stock.reserve', 'Payment.OnCharged --> Shop.markPaid'),
  ];
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [`WARN JF-REDRAW ${lineOf(ls, 'Shop.confirm --> Stock.reserve')}`]);
  assert.match(r.issues[0].msg, /^출발 노드 'Shop\.confirm' — 줄 \d+에서 그린 칸 아래 같은 열에 'Shop\.markPaid'\(줄 \d+\) 칸이 먼저 생겨/);
  assert.match(r.issues[0].msg, new RegExp(`줄 ${lineOf(ls, 'Shop.confirm --> Payment.charge')} 바로 뒤로 옮긴다\\(깊이 우선\\)$`));
});

test('JF-REDRAW — 값 분기 칸·단독 줄이 같은 열을 먼저 차지하면 앞 노드를 다시 그리고, 하류 줄을 먼저 쓰면 이어진다', async () => {
  const head = ['scope: 결제 승인', 'Object: Shop, Payment, Ledger', 'Shop.pay --> Payment.charge'];
  const ls = [
    ...jf(...head, 'Payment.charge.ok --> Shop.markPaid', 'Payment.charge --> Ledger.record'), // 값 분기 칸 뒤
    ...jf(...head, 'Payment.charge.declined', 'Payment.charge --> Ledger.record'), // 단독 줄 뒤
    ...jf(...head, 'Payment.charge --> Ledger.record', 'Payment.charge.ok --> Shop.markPaid', 'Payment.charge.declined'),
  ];
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [
    `WARN JF-REDRAW ${lineOf(ls, 'Payment.charge --> Ledger.record', 1)}`,
    `WARN JF-REDRAW ${lineOf(ls, 'Payment.charge --> Ledger.record', 2)}`,
  ]);
  assert.match(r.issues[0].msg, /같은 열에 'Payment\.charge\.ok'\(줄 \d+\) 칸이/);
  assert.match(r.issues[1].msg, /같은 열에 'Payment\.charge\.declined'\(줄 \d+\) 칸이/);
});

test('JF-REDRAW — 막은 칸이 생긴 때에 따라 고치는 법이 다르다(같은 객체 안 화살표·먼저 생긴 칸), 넷째 칸부터는 개수만', async () => {
  const ls = [
    ...jf('scope: 주문 접수', 'Object: Shop, Stock', 'Shop.placeOrder --> Shop.validate', 'Shop.placeOrder --> Stock.reserve'),
    ...jf('scope: 주문 접수', 'Object: Shop', 'Shop.placeOrder --> Shop.check', 'Shop.placeOrder --> Shop.price'),
    ...jf('scope: 주문 접수', 'Object: Shop, Stock', 'Shop.placeOrder --> Stock.hold', 'Shop.placeOrder --> Shop.audit'), // 통과
    ...jf('scope: 주문 처리', 'Object: Browser, Shop, Stock, Ledger',
      'Browser.order --> Shop.place', 'Ledger.close --> Stock.count', 'Shop.place --> Stock.reserve',
      'Browser.cancel --> Shop.undo', 'Stock.reserve --> Ledger.post'),
    ...jf('scope: 주문 결제', 'Object: Shop, Payment, Bank',
      'Shop.placeOrder --> Payment.card', 'Shop.placeOrder --> Payment.point', 'Shop.placeOrder --> Payment.coupon',
      'Shop.placeOrder --> Payment.gift', 'Shop.placeOrder --> Payment.voucher', 'Payment.card --> Bank.approve'),
  ];
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [
    `WARN JF-REDRAW ${lineOf(ls, 'Shop.placeOrder --> Stock.reserve')}`,
    `WARN JF-REDRAW ${lineOf(ls, 'Shop.placeOrder --> Shop.price')}`,
    `WARN JF-REDRAW ${lineOf(ls, 'Stock.reserve --> Ledger.post')}`,
    `WARN JF-REDRAW ${lineOf(ls, 'Payment.card --> Bank.approve')}`,
  ]);
  const [cross, self, early, many] = r.issues.map((i) => i.msg);
  const validate = lineOf(ls, 'Shop.placeOrder --> Shop.validate');
  assert.match(cross, new RegExp(`줄 ${validate}의 같은 객체 안 화살표가 그 칸을 만들었다 — 이 줄을 줄 ${validate} 앞으로 옮긴다`));
  assert.match(self, new RegExp(`같은 객체 안 화살표는 한 노드에서 마지막 줄 하나만 이어진다\\(먼저 이은 줄 ${lineOf(ls, 'Shop.placeOrder --> Shop.check')}\\)`));
  assert.match(early, new RegExp(`막은 칸이 이 노드 칸보다 먼저\\(줄 ${lineOf(ls, 'Ledger.close --> Stock.count')}\\) 생겼다 — 그 줄을 이 줄 뒤로`));
  assert.match(many, /'Payment\.point'\(줄 \d+\)·'Payment\.coupon'\(줄 \d+\)·'Payment\.gift'\(줄 \d+\) 외 1칸이 먼저 생겨/);
});

test('JF-REDRAW — 앞 줄 대상에서 같은 행으로 이어지면 그 칸 아래에 칸이 있어도 새 칸이 아니라 통과', async () => {
  // Stock.reserve는 0행에 놓이고 그 아래 1행에 Stock.count가 먼저 있다. 렌더러는 바로 앞 줄의 대상인 Stock.reserve 칸에서
  // 같은 행으로 가는 길이 비어 있으면 그 칸을 그대로 쓴다 — 새 칸이 생기지 않으므로 끊기지 않는다.
  const ls = jf('scope: 주문 처리', 'Object: Browser, Shop, Stock, Ledger',
    'Browser.order --> Shop.place', 'Ledger.close --> Stock.count', 'Shop.place --> Stock.reserve', 'Stock.reserve --> Ledger.post');
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), []);
});

test('JF-REDRAW — 헤더 없는 조각도 렌더러가 그리므로 보고, Object:에 없는 객체가 있는 블록은 보지 않는다', async () => {
  const body = ['Shop.pay --> Payment.card', 'Shop.pay --> Payment.point', 'Payment.card --> Bank.approve'];
  const ls = [
    ...jf('Object: Shop, Payment, Bank', ...body),
    ...jf('scope: 결제', 'Object: Shop, Payment', ...body),
  ];
  const r = await checkDoc(ls);
  assert.deepEqual(brief(r), [
    `FAIL JF-HEADER ${lineOf(ls, 'Object: Shop, Payment, Bank')}`,
    `WARN JF-REDRAW ${lineOf(ls, 'Payment.card --> Bank.approve', 1)}`,
    `FAIL JF-OBJECT ${lineOf(ls, 'Payment.card --> Bank.approve', 2)}`,
  ]);
});

/* ------------------------------------------------------------ 링크·앵커 */

test('LINK·ANCHOR — 대상 없음·앵커 없음은 FAIL, 코드·주석·외부·비 .md 조각은 건너뛴다', async () => {
  const enc = encodeURIComponent('세부-규칙');
  const a = [
    '# 문서 A', '',
    '## 개요', '', '## 개요', '',
    '<a id="custom-id"></a>', '',
    '- [없는 파일](missing.md)',
    '- [있는 파일](b.md)·[폴더](sub/)·[JSON 조각](data.json#/x)',
    `- [있는 앵커](b.md#세부-규칙)·[인코딩 앵커](b.md#${enc})`,
    '- [없는 앵커](b.md#없는-제목)',
    '- [펜스 안 제목](b.md#펜스-안-제목)',
    '- [둘째 개요](#개요-1)·[HTML id](#custom-id)',
    '- ![없는 그림](img/none.png)',
    '- [외부](https://example.com/x.md#y)·[메일](mailto:someone@example.com)·[루트](/x.md)',
    '- `[코드 안](missing-in-code.md)`',
    '',
    '```text', '[펜스 안](missing-in-fence.md)', '```', '',
    '<!-- [주석 안](missing-in-comment.md) -->', '',
  ];
  const dir = fixture({
    'a.md': a,
    'b.md': ['# 문서 B', '', '## 세부 규칙', '', '```md', '## 펜스 안 제목', '```', ''],
    'data.json': '{}\n',
    'sub/c.md': ['# C', ''],
    'Guide.md': ['# 가이드', ''],
    'case.md': ['[대소문자만 다름](guide.md)', ''],
  });
  const r = await run(path.join(dir, 'a.md'), path.join(dir, 'case.md'));
  assert.deepEqual(r.issues.map((i) => `${i.file}:${i.line} ${i.level} ${i.code}`), [
    `a.md:${lineOf(a, '- [없는 파일](missing.md)')} FAIL LINK`,
    `a.md:${lineOf(a, '- [없는 앵커](b.md#없는-제목)')} FAIL ANCHOR`,
    `a.md:${lineOf(a, '- [펜스 안 제목](b.md#펜스-안-제목)')} FAIL ANCHOR`,
    `a.md:${lineOf(a, '- ![없는 그림](img/none.png)')} FAIL LINK`,
    'case.md:1 FAIL LINK', // 대소문자를 구분하지 않는 파일 시스템이면 '대소문자 불일치', 구분하면 '대상 파일 없음'
  ]);
  assert.match(r.out.find((l) => l.startsWith('links=')), /skipped=3 /);

  // 같은 프로세스의 다음 실행도 새 폴더의 대소문자 차이를 찾는다(지난 실행의 폴더 목록을 다시 쓰지 않는다).
  const again = await run(fixture({ 'Notes.md': ['# 메모', ''], 'x.md': ['[메모](notes.md)', ''] }));
  assert.deepEqual(brief(again), ['FAIL LINK 1']);
});

test('LINK-OUTSIDE — git 저장소 루트를 넘는 상대 링크는 WARN(대상이 없으면 LINK FAIL도), 안쪽 링크는 통과', async () => {
  const a = [
    '# 주문 설계', '',
    '- [안쪽](../guide.md)·[안쪽 앵커](../guide.md#개요)·[같은 문서](#주문-설계)·[폴더](./)',
    '- [밖 가이드](../../shared/guide.md#개요)',
    '- [밖 없는 파일](../../shared/missing.md)',
    '- ![밖 그림](../../shared/flow.png)',
    '- [나갔다 돌아오는 길](../../repo/guide.md)',
    '- [외부](https://example.com/guide.md)·[루트 기준](/guide.md)·`[코드 안](../../shared/guide.md)`',
    '',
  ];
  const dir = fixture({
    'repo/guide.md': ['# 가이드', '', '## 개요', ''],
    'repo/docs/a.md': a,
    'repo/notes.md': ['# 메모', '', '[밖 가이드](../shared/guide.md)', ''],
    'shared/guide.md': ['# 공유 가이드', '', '## 개요', ''],
    'shared/flow.png': 'png\n',
  });
  gitInit(path.join(dir, 'repo'));
  const r = await run(path.join(dir, 'repo', 'docs'));
  assert.deepEqual(brief(r), [
    `WARN LINK-OUTSIDE ${lineOf(a, '- [밖 가이드](../../shared/guide.md#개요)')}`,
    `WARN LINK-OUTSIDE ${lineOf(a, '- [밖 없는 파일](../../shared/missing.md)')}`,
    `FAIL LINK ${lineOf(a, '- [밖 없는 파일](../../shared/missing.md)')}`,
    `WARN LINK-OUTSIDE ${lineOf(a, '- ![밖 그림](../../shared/flow.png)')}`,
    `WARN LINK-OUTSIDE ${lineOf(a, '- [나갔다 돌아오는 길](../../repo/guide.md)')}`,
  ]);
  const [out, , , back] = pick(r, 'LINK-OUTSIDE');
  assert.match(out.msg, /다른 컴퓨터에서 깨진다/);
  assert.match(out.msg, /파일 이름과 절 제목/);
  assert.match(back.msg, /저장소 안 경로로 쓴다: \.\.\/guide\.md$/);
  assert.deepEqual(r.err, []);
  assert.equal(r.code, 1);

  // WARN만 남으면 exit 0이고, --strict는 exit 1이다.
  const notes = path.join(dir, 'repo', 'notes.md');
  const warnOnly = await run(notes);
  assert.deepEqual(brief(warnOnly), ['WARN LINK-OUTSIDE 3']);
  assert.equal(warnOnly.code, 0);
  assert.equal((await run('--strict', notes)).code, 1);
});

test('LINK-OUTSIDE — 가장 가까운 .git이 루트다(.git이 파일인 submodule·worktree 포함)', async () => {
  const doc = ['# 결제 모듈', '', '[상위 저장소 가이드](../../../guide.md)·[모듈 안내](../readme.md)', ''];
  const dir = fixture({
    'repo/guide.md': ['# 가이드', ''],
    'repo/modules/payment/.git': 'gitdir: ../../.git/modules/payment\n',
    'repo/modules/payment/readme.md': ['# 모듈 안내', ''],
    'repo/modules/payment/docs/a.md': doc,
  });
  gitInit(path.join(dir, 'repo'));
  const r = await run(path.join(dir, 'repo', 'modules', 'payment', 'docs'));
  assert.deepEqual(brief(r), [`WARN LINK-OUTSIDE ${lineOf(doc, doc[2])}`]);
  assert.match(r.issues[0].msg, /\.\.\/\.\.\/\.\.\/guide\.md/);
  assert.equal(r.code, 0);
});

test('LINK-OUTSIDE — git 저장소 루트를 못 찾으면 검사하지 않고 stderr에 알린다', { skip: insideGit(ROOT) && '임시 폴더가 git 저장소 안에 있다' }, async () => {
  const a = ['# 문서', '', '[공유 가이드](../../shared/guide.md)·[같은 문서](#문서)', ''];
  const dir = fixture({
    'work/docs/a.md': a,
    'work/docs/b.md': ['# 같은 문서 링크만', '', '[처음](#같은-문서-링크만)', ''],
    'shared/guide.md': ['# 공유 가이드', ''],
  });
  const docs = path.join(dir, 'work', 'docs');
  const r = await run(docs);
  assert.deepEqual(brief(r), []);
  assert.equal(r.code, 0);
  assert.deepEqual(r.err, ['design-doc-check: git 저장소 루트(.git)를 찾지 못한 문서 1편은 LINK-OUTSIDE를 보지 않았다']);

  gitInit(path.join(dir, 'work')); // 같은 문서를 저장소 안에 두면 WARN이 나온다
  const inRepo = await run(docs);
  assert.deepEqual(brief(inRepo), [`WARN LINK-OUTSIDE ${lineOf(a, a[2])}`]);
  assert.deepEqual(inRepo.err, []);
});

/** 대소문자 사례: 저장소 폴더 'Repo'와 그 안의 문서 docs/a.md. a = 문서 줄, dir = 사례 폴더. */
function caseRepo() {
  const a = [
    '# 결제 설계', '',
    '- [안쪽](../guide.md#개요)',
    '- [소문자로 돌아옴](../../repo/guide.md)',
    '- [같은 이름으로 돌아옴](../../Repo/guide.md)',
    '- [밖](../../shared/guide.md)',
    '',
  ];
  const dir = fixture({
    'Repo/guide.md': ['# 가이드', '', '## 개요', ''],
    'Repo/docs/a.md': a,
    'shared/guide.md': ['# 공유 가이드', ''],
  });
  gitInit(path.join(dir, 'Repo'));
  return { a, dir };
}

test('LINK-OUTSIDE — 저장소 폴더 이름의 대소문자만 다르게 적은 링크는 디스크의 실제 이름으로 판정한다', async () => {
  const { a, dir } = caseRepo();
  const lower = lineOf(a, '- [소문자로 돌아옴](../../repo/guide.md)');
  const same = lineOf(a, '- [같은 이름으로 돌아옴](../../Repo/guide.md)');
  const outside = lineOf(a, '- [밖](../../shared/guide.md)');
  const r = await run(path.join(dir, 'Repo', 'docs'));
  assert.deepEqual(brief(r), [
    `WARN LINK-OUTSIDE ${lower}`, `FAIL LINK ${lower}`,
    `WARN LINK-OUTSIDE ${same}`,
    `WARN LINK-OUTSIDE ${outside}`,
  ]);
  const [lw, sm, ot] = pick(r, 'LINK-OUTSIDE');
  const link = pick(r, 'LINK')[0];
  if (NOCASE) {
    // 'repo'가 실제 폴더 'Repo'로 열린다 — 루트 밖이 아니라 나갔다가 돌아오는 링크이고, 대소문자 LINK FAIL이 함께 난다.
    assert.match(lw.msg, /^저장소 루트 위로 나갔다가 돌아오는 링크: .*저장소 안 경로로 쓴다: \.\.\/guide\.md$/);
    assert.match(link.msg, /^대소문자 불일치: .*실제 이름 'Repo'/);
  } else {
    // 대소문자를 구분하면 'repo'는 없는 폴더다 — 해석한 대상이 루트 밖이다.
    assert.match(lw.msg, /^저장소 루트를 벗어나는 링크: /);
    assert.match(link.msg, /^대상 파일 없음: /);
  }
  assert.match(sm.msg, /^저장소 루트 위로 나갔다가 돌아오는 링크: .*저장소 안 경로로 쓴다: \.\.\/guide\.md$/);
  assert.match(ot.msg, /^저장소 루트를 벗어나는 링크: /);
});

test('LINK·LINK-OUTSIDE — 명령줄로 준 경로의 대소문자가 디스크와 달라도 결과가 같다', { skip: !NOCASE && '대소문자를 구분하는 파일 시스템' }, async () => {
  const { dir } = caseRepo();
  const exact = await run(path.join(dir, 'Repo', 'docs'));
  const typed = await run(path.join(dir, 'repo', 'DOCS'));
  assert.deepEqual(brief(typed), brief(exact));
  assert.deepEqual(typed.issues.map((i) => i.msg), exact.issues.map((i) => i.msg));
  // 바르게 적은 '../guide.md#개요'는 명령줄의 'repo'·'DOCS' 때문에 LINK FAIL이 되지 않는다 — LINK FAIL은 소문자 링크 하나뿐이다.
  assert.equal(pick(typed, 'LINK').length, 1);
  assert.match(pick(typed, 'LINK-OUTSIDE')[2].msg, /\(저장소 루트 .*[\\/]Repo\)/);
});

/* ------------------------------------------------------------ mermaid */

test('MERMAID — <br>·따옴표 없는 노드·엣지 라벨은 WARN, flowchart 밖은 라벨을 보지 않는다', async () => {
  const ls = [
    ...mm('flowchart TB', '  A[주문] --> B["결제"]', '  B -->|승인| C["배송"]', '  C -- 완료 --> D["알림<br>발송"]'),
    ...mm('flowchart TB', '  A["주문"] -->|"승인"| B[("결제 기록")]', '  subgraph S["경계·가상"]', '    B', '  end',
      '  B -- "완료" --> C(["배송"])', '  C --- D["보관"] --- E["삭제"]'),
    ...mm('sequenceDiagram', '  Order->>Payment: 결제 요청(1)'),
  ];
  const r = await checkDoc(ls);
  const lineC = lineOf(ls, '  C -- 완료 --> D["알림<br>발송"]');
  assert.deepEqual(brief(r), [
    `WARN MERMAID ${lineOf(ls, '  A[주문] --> B["결제"]')}`,
    `WARN MERMAID ${lineOf(ls, '  B -->|승인| C["배송"]')}`,
    `WARN MERMAID ${lineC}`,
    `WARN MERMAID ${lineC}`,
  ]);
  assert.equal(r.code, 0);
  assert.match(r.out.find((l) => l.startsWith('links=')), /mermaid=3/);
});

/* ------------------------------------------------------------ 렌더러 */

const SVG_OK = [
  'export default {',
  '  generateSVG(src) {',
  "    return '<svg xmlns=\"http://www.w3.org/2000/svg\"><desc>' + src.split('\\n').length + '</desc></svg>';",
  '  },',
  '};',
];

test('--renderer — 블록마다 <문서basename>-NN.svg, 같은 basename은 경로로 구분, 예외는 RENDER FAIL', async () => {
  const block = jf('scope: 주문', 'Object: Order, Payment', 'Order.place --> Payment.charge');
  const dir = fixture({
    'docs/a.md': [...block, ...jf('scope: 주문', 'Object: Order, Payment', 'Payment.charge --> Order.confirm')],
    'docs/as-is/same.md': block,
    'docs/to-be/same.md': block,
    'render-ok.mjs': SVG_OK,
    'render-throw.mjs': "export function generateSVG() { throw new Error('가상 렌더 실패'); }\n",
  });
  const out = path.join(dir, 'svg');
  const ok = await run('--renderer', path.join(dir, 'render-ok.mjs'), '--out', out, path.join(dir, 'docs'));
  assert.equal(ok.code, 0, dump(ok));
  assert.deepEqual(fs.readdirSync(out).sort(), ['a-01.svg', 'a-02.svg', 'as-is__same-01.svg', 'to-be__same-01.svg']);
  assert.match(fs.readFileSync(path.join(out, 'a-01.svg'), 'utf8'), /<desc>3<\/desc>/);

  const doc = [...block, ...block];
  const bad = await run('--renderer', path.join(dir, 'render-throw.mjs'), '--out', path.join(dir, 'svg-bad'), fixture({ 'doc.md': doc }));
  assert.equal(bad.code, 1);
  assert.deepEqual(brief(bad), ['FAIL RENDER 1', `FAIL RENDER ${lineOf(doc, '```jobflow', 2)}`]);
  assert.match(bad.issues[0].msg, /가상 렌더 실패/);
});

test('--renderer — .js를 그대로 못 읽으면 임시 .mjs·.cjs 사본으로 읽는다', async () => {
  const svg = "'<svg xmlns=\"http://www.w3.org/2000/svg\"/>'";
  const dir = fixture({
    'doc.md': jf('scope: 주문', 'Object: Order, Payment', 'Order.place --> Payment.charge'),
    'esm/package.json': '{ "type": "commonjs" }\n',
    'esm/render.js': `export default { generateSVG() { return ${svg}; } };\n`,
    'cjs/package.json': '{ "type": "module" }\n',
    'cjs/render.js': `module.exports = { generateSVG() { return ${svg}; } };\n`,
  });
  for (const kind of ['esm', 'cjs']) {
    const out = path.join(dir, `svg-${kind}`);
    const r = await run('--renderer', path.join(dir, kind, 'render.js'), '--out', out, path.join(dir, 'doc.md'));
    assert.equal(r.code, 0, `${kind}: ${dump(r)}`);
    assert.deepEqual(fs.readdirSync(out), ['doc-01.svg']);
  }
});

test('--renderer — --out 없이 쓴 기본 SVG 폴더가 git 저장소 안이면 stderr에 한 줄로 알린다', () => {
  const dir = fixture({
    'repo/doc.md': jf('scope: 주문', 'Object: Order, Payment', 'Order.place --> Payment.charge'),
    'render-ok.mjs': SVG_OK,
  });
  const repo = path.join(dir, 'repo');
  gitInit(repo);
  const renderer = path.join(dir, 'render-ok.mjs');
  // 기본 폴더는 현재 폴더 기준이라 cwd를 바꿔 CLI 프로세스로 돌린다.
  const cli = (cwd, ...a) => spawnSync(process.execPath, [TOOL, '--renderer', renderer, ...a, path.join(repo, 'doc.md')], { cwd, encoding: 'utf8' });
  const notes = (r) => r.stderr.split('\n').filter((l) => l.startsWith('design-doc-check:')); // 도구가 낸 stderr 줄만

  const inRepo = cli(repo);
  assert.equal(inRepo.status, 0, inRepo.stderr);
  assert.ok(fs.existsSync(path.join(repo, '.design-doc-check', 'doc-01.svg')));
  assert.deepEqual(notes(inRepo), ['design-doc-check: SVG 폴더가 git 저장소 안이다(--out 기본값): .design-doc-check — 대상 저장소에서는 --out에 저장소 밖 임시 폴더를 준다(양식 §10)']);
  assert.equal(inRepo.stdout.trimEnd().split('\n').pop(), 'files=1 blocks=1 fail=0 warn=0');

  // --out을 주면 저장소 안 폴더여도 알리지 않는다 — 사용자가 고른 폴더다.
  assert.deepEqual(notes(cli(repo, '--out', path.join(dir, 'svg'))), []);
  assert.deepEqual(notes(cli(repo, '--out', '.design-doc-check')), []);
  // git 저장소 밖에서 돌리면 기본 폴더여도 알리지 않는다.
  if (!insideGit(dir)) {
    const outside = cli(dir);
    assert.deepEqual(notes(outside), []);
    assert.ok(fs.existsSync(path.join(dir, '.design-doc-check', 'doc-01.svg')));
  }
});

test('--renderer — 파일이 없거나 generateSVG 함수가 없으면 사용법 오류(exit 2)', async () => {
  const dir = fixture({ 'doc.md': ['# 문서', ''], 'empty.mjs': 'export const name = "가상";\n' });
  assert.equal((await run('--renderer', path.join(dir, 'none.mjs'), dir)).code, 2);
  const r = await run('--renderer', path.join(dir, 'empty.mjs'), dir);
  assert.equal(r.code, 2);
  assert.match(r.err[0], /generateSVG/);
});

/* ------------------------------------------------------------ 실행·집계 */

test('통과 사례 — 양식대로 쓴 핵심·상세 두 편은 FAIL·WARN 0', async () => {
  const core = [
    '# 가상 주문 시스템 — AS-IS', '',
    '## 0. 한눈에 보기 — 주문·결제', '',
    ...mm('flowchart LR', '  U["사용자"] -->|"HTTPS"| WEB["web :8080<br/>관문"]', '  WEB -- "주문 요청" --> DB[("주문 DB")]'),
    '## 5. 흐름 — 경계끼리 어떻게 소통하나', '',
    '### 5.1 전체 한 장', '',
    ...jf('scope: 주문 처리', 'Object: Browser, Shop, Payment',
      'Browser.order --> Shop.placeOrder',
      'Shop.placeOrder --> Payment.charge',
      'Payment.charge.result --> Shop.placeOrder.done',
      'Shop.placeOrder.result --> Browser.showReceipt'),
    '- 드릴다운: [JF-1](details/shop.md#jf-1-주문-접수--shopplaceorder)·[이 절](#51-전체-한-장)', '',
  ];
  const detail = [
    '# shop (:8081) — AS-IS 상세', '',
    '## 3. 내부 Job Flow — 드릴다운', '',
    '### JF-1 주문 접수 — `Shop.placeOrder`', '',
    ...jf('orchestrator: OrderService', 'Object: OrderController, OrderService, PaymentClient',
      'OrderController.placeOrder --> OrderService.place',
      'OrderService.place --> PaymentClient.charge',
      'PaymentClient.charge.result --> OrderService.place.done',
      'OrderService.isPaid.true'),
    '상위: [§5.1](../core.md#51-전체-한-장)', '',
  ];
  const dir = fixture({ 'core.md': core, 'details/shop.md': detail });
  const r = await run(dir);
  assert.equal(r.code, 0, dump(r));
  assert.deepEqual(brief(r), []);
  assert.equal(r.last, 'files=2 blocks=2 fail=0 warn=0');
  assert.match(r.out.at(-2), /^links=3 skipped=0 mermaid=1$/);
});

test('CRLF 줄끝·BOM이 있는 문서도 같은 결과', async () => {
  const ls = ['# 문서', '', ...jf('scope: 주문', 'Object: Order, Payment', 'Order.place --> Payment.charge'), '## 끝', '', '[처음](#문서)·[끝](#끝)', ''];
  const dir = fixture({ 'doc.md': `\uFEFF${ls.join('\r\n')}` });
  const r = await run(dir);
  assert.equal(r.code, 0, dump(r));
  assert.equal(r.last, 'files=1 blocks=1 fail=0 warn=0');
});

test('폴더는 재귀로 *.md만 모으고 점(.)으로 시작하는 폴더·node_modules는 건너뛴다', async () => {
  const dir = fixture({
    'docs/a.md': ['# A', '', '[B](sub/b.md)', ''],
    'docs/sub/b.md': ['# B', ''],
    'docs/.cache/c.md': ['[깨진 링크](missing.md)', ''],
    'docs/node_modules/d.md': ['[깨진 링크](missing.md)', ''],
    'docs/notes.txt': '[깨진 링크](missing.md)\n',
  });
  const r = await run(path.join(dir, 'docs'));
  assert.equal(r.code, 0, dump(r));
  assert.equal(r.last, 'files=2 blocks=0 fail=0 warn=0');
});

test('--strict — WARN만 있으면 기본 exit 0, --strict는 exit 1(CLI 프로세스로도 확인)', async () => {
  const dir = fixture({ 'doc.md': jf('scope: 주문', 'Object: Order, Payment, Ledger', 'Order.place --> Payment.charge') });
  const loose = await run(dir);
  assert.equal(loose.code, 0);
  assert.equal(loose.last, 'files=1 blocks=1 fail=0 warn=1');
  const strict = await run('--strict', dir);
  assert.equal(strict.code, 1);
  assert.equal(strict.last, 'files=1 blocks=1 fail=0 warn=1');

  const cli = (...a) => spawnSync(process.execPath, [TOOL, ...a], { encoding: 'utf8' });
  assert.equal(cli(dir).status, 0);
  const s = cli('--strict', dir);
  assert.equal(s.status, 1);
  assert.match(s.stdout, /^WARN JF-UNUSED /m);
  assert.equal(s.stdout.trimEnd().split('\n').pop(), 'files=1 blocks=1 fail=0 warn=1');
  assert.equal(cli().status, 2);
});

test('사용법 오류는 exit 2, --help는 exit 0', async () => {
  const dir = fixture({ 'doc.md': ['# 문서', ''], 'empty/readme.txt': '가상\n' });
  assert.equal((await run()).code, 2);
  assert.equal((await run('--bogus', dir)).code, 2);
  assert.equal((await run(path.join(dir, 'nope'))).code, 2);
  assert.equal((await run(dir, '--renderer')).code, 2);
  assert.equal((await run(path.join(dir, 'empty'))).code, 2);
  const help = await run('--help');
  assert.equal(help.code, 0);
  assert.match(help.out[0], /^usage: /);
});

test('--help — 수준별 코드·JF-LABEL 판정·JF-HEADER WARN·같은 basename SVG 이름·기본 폴더 알림·합격 기준·렌더러 인터페이스', async () => {
  const help = (await run('--help')).out[0];
  const lines = help.split('\n');
  const part = (from, to) => lines.slice(lines.findIndex((l) => l.startsWith(from)), lines.findIndex((l) => l.startsWith(to))).join('\n');
  const fail = part('FAIL', 'WARN');
  const warn = part('WARN', '합격');
  assert.match(fail, /JF-LABEL = 화살표 줄과 단독\(분기\) 줄의 ':' 라벨\('::'만 예외\) — ' : ' 꼴과 'A\.b --> C\.d:x' 꼴 모두/);
  assert.match(warn, /^WARN .*LINK-OUTSIDE/m);
  assert.match(warn, /^WARN .*JF-REDRAW/m);
  assert.match(warn, /JF-REDRAW = 렌더러가 출발 노드를 새 칸에 다시 그려 흐름이 끊기는 줄/);
  assert.match(warn, /master: 헤더와 Object:에 없는 orchestrator 이름의 JF-HEADER/);
  assert.match(help, /basename이 같은 문서가 여럿이면 공통 상위 폴더부터의 경로를 __로 잇는다\(as-is__details__x-01\.svg\)/);
  assert.match(help, /--out <dir> +SVG 폴더\(기본 \.\/\.design-doc-check — 기본 폴더가 git 저장소 안이면 stderr에 알린다\)/);
  assert.match(help, /^합격 +FAIL 0이고 남은 WARN마다 문서 본문에 이유가 있다/m);
  assert.match(help, /generateSVG\(jobflow 원문\) → SVG 문자열/);
});

test('마지막 줄은 files=… blocks=… fail=… warn=…', async () => {
  const r = await checkDoc(['# 문서', '', '```js', 'order()', '']);
  assert.match(r.last, /^files=\d+ blocks=\d+ fail=\d+ warn=\d+$/);
  assert.equal(r.last, 'files=1 blocks=0 fail=1 warn=0');
});
