#!/usr/bin/env node
/*
 * design-doc-check.mjs — 시스템 설계 문서(Markdown) 정적 검사
 *
 * 용도    AS-IS·TO-BE 설계 문서의 펜스·jobflow 표기·상대 링크·앵커·Mermaid 라벨을 검사한다.
 *         양식 원본 ../system-design-document-guide.md §10, jobflow 문법 원본 ../job-flow-diagram-guide.md
 * 사용법  node guides/tools/design-doc-check.mjs [--renderer <path>] [--out <dir>] [--strict] <file-or-dir>...
 *         폴더는 재귀로 *.md를 모은다(점으로 시작하는 폴더와 node_modules는 건너뛴다 — 직접 주면 읽는다).
 *         Node 18+, 의존성 없음. 테스트: node --test guides/tools/design-doc-check.test.mjs
 *   --renderer <path>  jobflow 렌더러 모듈. 블록마다 <out>/<문서basename>-NN.svg를 쓴다(NN = 그 문서 안 jobflow
 *                      블록 순번, 01부터). basename이 같은 문서가 여럿이면 공통 상위 폴더부터의 경로를 밑줄 두 개(__)로
 *                      이어 이름으로 쓴다(as-is__details__x-01.svg). 모듈 인터페이스: generateSVG(jobflow 원문) → SVG
 *                      문자열을 default 객체의 메서드나 이름 있는 export로 낸다. .js를 ESM으로 못 읽으면 os.tmpdir()에
 *                      .mjs(그다음 .cjs) 사본을 만들어 읽는다 — 다른 파일을 상대 경로로 import하지 않는 단일 파일
 *                      렌더러에서만 통한다.
 *   --out <dir>        SVG 폴더(기본 ./.design-doc-check). 지우지 않고 덮어쓴다. --out 없이 쓴 기본 폴더가 git 저장소
 *                      안이면 stderr에 한 줄로 알린다 — 대상 저장소에서는 저장소 밖 임시 폴더를 준다(양식 §10).
 *   --strict           WARN도 실패로 센다. WARN을 모두 없애기로 한 문서에만 쓴다(아래 합격 기준).
 *   exit 0(실패 없음)·1(실패 있음)·2(사용법 오류)
 * 출력    'LEVEL CODE file:line 메시지'(LEVEL = FAIL|WARN) 줄들 → 보조 집계 'links=… skipped=… mermaid=…'
 *         → 마지막 줄 'files=<문서 수> blocks=<jobflow 블록 수> fail=<n> warn=<n>'.
 *         stderr에는 사용법 오류와 알림을 쓴다. 알림은 셋이다: git 저장소 루트를 못 찾아 LINK-OUTSIDE를 보지 않은
 *         문서 수, --out 없이 쓴 기본 SVG 폴더가 git 저장소 안이라는 것, --renderer 없이 준 --out.
 * 합격    FAIL 0이고 남은 WARN마다 문서 본문에 이유가 있다. 이유를 적고 남긴 WARN이 있으면 --strict는 실패하므로
 *         --strict를 합격 판정에 쓰지 않는다.
 * 검사
 *   FENCE        FAIL  줄 맨 앞(공백 0~3칸) ```·~~~ 펜스가 닫히지 않음, 열린 펜스 안에 같은 문자이고 길이가 같거나 긴
 *                      여는 펜스 모양 줄(앞 펜스를 닫지 않은 흔적). 인라인 코드와 인용(>) 안 펜스는 짝을 보지 않는다.
 *   JF-HEADER    FAIL  첫 비어 있지 않은 줄이 orchestrator:/scope:가 아님, 이름이 비었거나 '-->'를 담음, 헤더 줄이 둘 이상
 *                WARN  master:, orchestrator 이름이 Object:에 없음
 *   JF-OBJECT    FAIL  Object: 줄 없음, 렌더러가 못 읽는 Object: 줄(들여쓰기·Objects: 등), 화살표 양끝과 단독(분기)
 *                      줄의 객체 미선언, 액션 없음, 객체 이름과 점 사이 공백, 한 줄에 화살표 둘 이상, '-->'가 아닌
 *                      화살표, 해석할 수 없는 줄
 *   JF-UNUSED    WARN  선언했지만 쓰지 않은 객체
 *   JF-LABEL     FAIL  화살표 줄·단독(분기) 줄의 ':' 라벨 — ' : ' 꼴과 'A.b --> C.d:x' 꼴 모두('::'만 예외)
 *   JF-NAME      WARN  객체 이름에 공백이나 점, 빈 이름, 중복 선언
 *   JF-ONNAME    WARN  액션 마지막 조각이 /^on/i인데 이벤트 꼴(on·On 뒤에 대문자·숫자·밑줄이나 한글처럼 대소문자 없는
 *                      글자)이 아님 → 렌더러가 이벤트로 그리고 앞 두 글자를 지운다(oneShotSession → eShotSession)
 *   JF-RETURN    WARN  orchestrator: X 그림에서 qualifier 없는 '--> X.method' 타깃이 2회 이상 → round-trip 의심
 *   LINK         FAIL  상대 링크 대상이 없음, 대소문자만 다른 이름(링크에 적은 조각만 본다 — 명령줄로 준 경로의
 *                      대소문자 차이는 보지 않는다)
 *   LINK-OUTSIDE WARN  상대 링크(파일 부분이 있는 것)가 문서가 속한 git 저장소 루트를 넘는다 — 해석한 대상이 루트 밖이거나,
 *                      루트 위로 나갔다가 다시 들어온다(저장소 폴더 이름에 기댄다). 둘 다 다른 컴퓨터에서 깨진다.
 *                      루트 = 문서 폴더에서 위로 올라가며 처음 만나는 .git(폴더나 파일)이 있는 폴더 — 못 찾으면 이 검사를
 *                      하지 않는다. 대상이 있든 없든 판정한다(없으면 LINK FAIL도 함께). 경로 조각은 디스크에 적힌
 *                      이름으로 맞춰 비교한다 — 대소문자를 구분하지 않는 파일 시스템에서 저장소 폴더가 'Repo'이고 링크가
 *                      '../../repo/x'이면 루트 밖이 아니라 나갔다가 돌아오는 링크다(대소문자 LINK FAIL도 함께).
 *   ANCHOR       FAIL  .md 대상의 #조각이 제목 슬러그·HTML id에 없음(.md가 아닌 대상은 조각을 보지 않는다)
 *   MERMAID      WARN  <br>(self-closing 아님), flowchart/graph의 따옴표 없는 노드 라벨(id[…]·id(…)·id{…} 꼴),
 *                      따옴표 없는 엣지 라벨(|…|·'-- … -->' 꼴) — 보수적 휴리스틱
 *   RENDER       FAIL  --renderer의 generateSVG 예외, SVG 문자열이 아닌 결과
 *   슬러그는 GitHub(github-slugger) 방식: 소문자 → 글자·결합문자·10진 숫자·연결 문장부호(_)·공백·하이픈 외 제거 →
 *   공백을 하이픈으로 → 같은 슬러그는 -1, -2. 제목 속 코드 스팬은 내용, 링크·이미지는 텍스트만 쓴다. Node 22.19
 *   (Unicode 16.0)에서 github-slugger 2.0.0(Unicode 13.0 데이터)과 서러게이트를 뺀 전 코드포인트를 대조했다 — 다른 것은
 *   Unicode 13.0 뒤에 새로 배정된 글자(이 도구는 남기고 github-slugger는 지운다)뿐이다. ZWNJ·ZWJ(U+200C·U+200D)도
 *   github-slugger처럼 지운다.
 *   인용(>) 안 펜스는 내용을 검사·수집하지 않는다. 펜스·인라인 코드·HTML 주석 안 링크, 스킴(http·mailto 등) 링크,
 *   '/'로 시작하는 링크는 건너뛴다.
 * 한계    정적 검사다. 통과해도 의미(상위 노드↔하위 진입점, 요청자 오독, 코드와의 일치)와 그림 배치는 보장하지 않는다 —
 *         렌더 결과는 PNG로 바꿔 눈으로, 의미는 검토자가 따로 확인한다. 4칸 이상 들여 쓴 펜스(목록 안 펜스 포함)·
 *         밑줄식(Setext) 제목·참조식 링크·여러 줄에 걸친 링크·HTML <a href>는 보지 않는다. 목록 항목 안 ATX 제목
 *         (목록 표지와 같은 줄의 '- ## 제목', 4칸 이상 들여 쓴 제목)은 제목으로 모으지 않는다 — 그 앵커로 가는 링크는
 *         ANCHOR FAIL이 된다. LINK-OUTSIDE는 경로 조각의 이름만 디스크에 맞추고(대소문자·유니코드 정규화) 심볼릭 링크를
 *         따라가지 않는다. jobflow 판정은 확인한 렌더러 사본의 파싱 규칙(첫 점에서 객체/액션을 가름, 'Object:'로 시작하는
 *         줄만 객체 목록)에 맞췄다 — 다른 버전은 다를 수 있다.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const USAGE = 'usage: node design-doc-check.mjs [--renderer <path>] [--out <dir>] [--strict] <file-or-dir>...';
const HELP = `${USAGE}

설계 문서(Markdown)의 펜스·jobflow 표기·상대 링크·앵커·Mermaid 라벨을 정적으로 검사한다.
  <file-or-dir>      검사할 .md 파일이나 폴더(폴더는 재귀로 *.md)
  --renderer <path>  jobflow 렌더러 모듈 — 블록마다 <out>/<문서basename>-NN.svg를 쓴다(NN = 문서 안 순번, 01부터)
                     basename이 같은 문서가 여럿이면 공통 상위 폴더부터의 경로를 __로 잇는다(as-is__details__x-01.svg)
                     모듈은 generateSVG(jobflow 원문) → SVG 문자열을 export default 객체나 이름 있는 export로 낸다
  --out <dir>        SVG 폴더(기본 ./.design-doc-check — 기본 폴더가 git 저장소 안이면 stderr에 알린다)
  --strict           WARN도 실패로 센다
출력  'LEVEL CODE file:line 메시지' 줄들, 마지막 줄 'files=… blocks=… fail=… warn=…'
FAIL  FENCE·JF-HEADER·JF-OBJECT·JF-LABEL·LINK·ANCHOR·RENDER
      JF-LABEL = 화살표 줄과 단독(분기) 줄의 ':' 라벨('::'만 예외) — ' : ' 꼴과 'A.b --> C.d:x' 꼴 모두
WARN  JF-UNUSED·JF-NAME·JF-ONNAME·JF-RETURN·MERMAID·LINK-OUTSIDE,
      master: 헤더와 Object:에 없는 orchestrator 이름의 JF-HEADER
      LINK-OUTSIDE = 상대 링크가 문서가 속한 git 저장소 루트를 넘는다(.git을 못 찾으면 보지 않는다)
합격  FAIL 0이고 남은 WARN마다 문서 본문에 이유가 있다. --strict는 WARN을 모두 없애기로 한 문서에만 쓴다
exit  0 = 실패 없음, 1 = 실패 있음, 2 = 사용법 오류
코드마다의 판정 조건 전체는 이 파일의 머리 주석에 있다.
정적 검사다 — 통과해도 그림 배치와 의미(요청자·상하위 노드 일치)는 따로 확인한다.`;

class UsageError extends Error {}

const issue = (level, code, line, msg) => ({ level, code, line, msg });
const clip = (s, n = 48) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const firstLine = (e) => String((e && e.message) || e).split('\n')[0];

/* ------------------------------------------------------------------ 슬러그 */

// github-slugger 2.0.0이 지우는 글자 집합 — Unicode 13.0 뒤 새로 배정된 글자만 다르다(머리 주석의 대조 결과).
// Join_Control(ZWNJ·ZWJ)은 남기지 않는다: github-slugger가 지운다.
const SLUG_REMOVE = /[^\p{Alphabetic}\p{M}\p{Nd}\p{Pc} -]/gu;

export function slug(text) {
  return String(text).toLowerCase().replace(SLUG_REMOVE, '').replace(/ /g, '-');
}

export class Slugger {
  constructor() {
    this.occurrences = Object.create(null);
  }

  slug(text) {
    const original = slug(text);
    let result = original;
    while (Object.prototype.hasOwnProperty.call(this.occurrences, result)) {
      this.occurrences[original] += 1;
      result = `${original}-${this.occurrences[original]}`;
    }
    this.occurrences[result] = 0;
    return result;
  }
}

/* ------------------------------------------------------- 인라인 코드·제목 */

// CommonMark 코드 스팬: 길이 n의 백틱 열부터 정확히 같은 길이의 백틱 열까지.
function codeSpans(s) {
  const spans = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] !== '`') { i += 1; continue; }
    let j = i;
    while (s[j] === '`') j += 1;
    const n = j - i;
    let k = j;
    let close = -1;
    while (k < s.length) {
      if (s[k] !== '`') { k += 1; continue; }
      let e = k;
      while (s[e] === '`') e += 1;
      if (e - k === n) { close = k; break; }
      k = e;
    }
    if (close < 0) { i = j; continue; } // 짝 없는 백틱 열은 글자
    spans.push({ start: i, end: close + n, inner: s.slice(j, close) });
    i = close + n;
  }
  return spans;
}

function blankCodeSpans(s) {
  let out = '';
  let pos = 0;
  for (const sp of codeSpans(s)) {
    out += s.slice(pos, sp.start) + ' '.repeat(sp.end - sp.start);
    pos = sp.end;
  }
  return out + s.slice(pos);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0' }; // nbsp는 슬러그에서 지워진다

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(cp); } catch { return m; }
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

// 제목 줄의 표시 텍스트: 코드 스팬은 내용만, 링크·이미지는 텍스트만, HTML 주석·태그·밑줄 강조 표기는 뺀다.
export function headingText(raw) {
  const s = raw.replace(/(^|[ \t]+)#+[ \t]*$/, '').trim(); // 닫는 # 열
  const codes = [];
  let t = '';
  let pos = 0;
  for (const sp of codeSpans(s)) {
    let inner = sp.inner;
    if (/^ .*[^ ].* $/.test(inner)) inner = inner.slice(1, -1);
    t += `${s.slice(pos, sp.start)}\u0000${codes.length}\u0000`;
    codes.push(inner);
    pos = sp.end;
  }
  t += s.slice(pos);
  t = t
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<([A-Za-z][A-Za-z0-9+.-]*:[^<>\s]*|[^<>\s@]+@[^<>\s@]+)>/g, '$1') // 자동 링크는 글자로 남는다
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/(^|[^\p{L}\p{N}_\\])(_{1,3})(?=\S)(.*?\S)\2(?![\p{L}\p{N}_])/gu, '$1$3')
    .replace(/\u0000(\d+)\u0000/g, (_, k) => codes[Number(k)]);
  return decodeEntities(t).trim();
}

/* ------------------------------------------------------------ 문서 해석 */

const FENCE_RE = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const QUOTE_MARK = /^ {0,3}> ?/;
const HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const ID_RE = /<[A-Za-z][^>]*?\s(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const LINK_RE = /(!?)\[((?:\\.|[^[\]\\]|\[(?:\\.|[^[\]\\])*\])*)\]\(\s*(<[^>]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+(?:"[^"]*"|'[^']*'|\([^()]*\)))?\s*\)/g;

function fenceOpen(line) {
  const m = FENCE_RE.exec(line);
  if (!m) return null;
  const char = m[2][0];
  if (char === '`' && m[3].includes('`')) return null; // 백틱 펜스의 정보 문자열엔 백틱이 없다 → 인라인 코드
  return { indent: m[1].length, char, len: m[2].length, info: m[3].trim() };
}

function isFenceClose(line, f) {
  const m = FENCE_RE.exec(line);
  return !!m && m[2][0] === f.char && m[2].length >= f.len && m[3].trim() === '';
}

function stripIndent(line, n) {
  let i = 0;
  while (i < n && line[i] === ' ') i += 1;
  return line.slice(i);
}

// 인용 표시('>')를 최대 max개까지 벗긴다.
function unquote(line, max = Infinity) {
  let depth = 0;
  let rest = line;
  while (depth < max) {
    const m = QUOTE_MARK.exec(rest);
    if (!m) break;
    depth += 1;
    rest = rest.slice(m[0].length);
  }
  return { depth, rest };
}

function collectLinks(scan, no, out) {
  for (const m of scan.matchAll(LINK_RE)) {
    out.push({ no, dest: m[3] });
    if (m[2].includes('](')) collectLinks(m[2], no, out); // [![그림](a.png)](b.md)
  }
}

/** 줄 단위로 펜스·인용·HTML 주석을 가려 블록·제목·링크를 모은다. */
export function parseMarkdown(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const doc = { blocks: [], issues: [], headings: [], ids: new Set(), links: [] };
  let fence = null; // 맨 바깥(인용 밖) 펜스
  let qfence = null; // 인용 안 펜스 — 내용은 보지 않는다
  let inComment = false;

  for (let i = 0; i < lines.length; i += 1) {
    const no = i + 1;
    const raw = lines[i];

    if (fence) {
      if (isFenceClose(raw, fence)) {
        fence.close = no;
        doc.blocks.push(fence);
        fence = null;
        continue;
      }
      const f = fenceOpen(raw);
      if (f && f.info && f.char === fence.char && f.len >= fence.len) {
        doc.issues.push(issue('FAIL', 'FENCE', no, `열린 펜스(줄 ${fence.open}) 안에 여는 펜스 모양 줄 — 앞 펜스가 닫히지 않았을 수 있다`));
      }
      fence.body.push({ no, text: stripIndent(raw, fence.indent) });
      continue;
    }

    let text = raw;
    if (inComment) {
      const end = text.indexOf('-->');
      if (end < 0) continue;
      inComment = false;
      text = ' '.repeat(end + 3) + text.slice(end + 3);
    }

    const q = unquote(text);
    if (qfence) {
      if (q.depth >= qfence.depth) {
        if (isFenceClose(unquote(text, qfence.depth).rest, qfence)) qfence = null;
        continue; // 인용 안 펜스 내용: 검사·수집 대상 아님
      }
      qfence = null; // 인용이 끝나면 그 안의 펜스도 끝난다
    }
    if (q.depth > 0) {
      const f = fenceOpen(q.rest);
      if (f) { qfence = { ...f, depth: q.depth }; continue; }
      text = q.rest;
    } else {
      const f = fenceOpen(text);
      if (f) {
        fence = { ...f, open: no, lang: (f.info.split(/\s+/)[0] || '').toLowerCase(), body: [] };
        continue;
      }
    }

    // 본문 줄: 인라인 코드와 HTML 주석을 공백으로 가린 사본에서 찾는다.
    let scan = blankCodeSpans(text);
    let from = 0;
    for (;;) {
      const open = scan.indexOf('<!--', from);
      if (open < 0) break;
      const close = scan.indexOf('-->', open + 4);
      if (close < 0) { scan = scan.slice(0, open); inComment = true; break; }
      scan = scan.slice(0, open) + ' '.repeat(close + 3 - open) + scan.slice(close + 3);
      from = close + 3;
    }

    if (HEADING_RE.test(scan)) {
      const m = HEADING_RE.exec(text);
      if (m) doc.headings.push({ no, text: headingText(m[2] || '') });
    }
    for (const m of scan.matchAll(ID_RE)) doc.ids.add(m[1] ?? m[2]);
    collectLinks(scan, no, doc.links);
  }

  if (fence) {
    doc.issues.push(issue('FAIL', 'FENCE', fence.open, `닫히지 않은 펜스 ${fence.char.repeat(fence.len)}${fence.info} — 문서 끝까지 코드로 읽힌다`));
  }
  const slugger = new Slugger();
  for (const h of doc.headings) h.slug = slugger.slug(h.text);
  doc.anchors = new Set([...doc.headings.map((h) => h.slug), ...doc.ids]);
  return doc;
}

/* ------------------------------------------------------------- jobflow */

// 렌더러처럼 첫 '.'에서 객체와 액션을 가른다. '.' 앞 공백은 렌더러가 객체 이름의 일부로 읽는다.
function endpoint(s) {
  const t = s.trim();
  const i = t.indexOf('.');
  if (i < 0) return { obj: t, action: '', spaced: false };
  const objRaw = t.slice(0, i);
  return { obj: objRaw.trim(), action: t.slice(i + 1).trim(), spaced: objRaw !== objRaw.trim() };
}

const hasLabelColon = (s) => s.replace(/::/g, '').includes(':');
const cutLabel = (s) => {
  const i = s.replace(/::/g, '\u0001\u0001').indexOf(':');
  return i < 0 ? s : s.slice(0, i);
};
const LABEL_MSG = "jobflow 줄에 ':' 라벨 — jobflow에는 라벨 문법이 없다(분기는 'Object.Method.값' 줄, 설명은 블록 밖)";
const OTHER_ARROW = /<-|->|=>|→|⇒|⟶/;
// 이벤트 꼴: on·On 뒤에 대문자·숫자·밑줄 또는 대소문자가 없는 글자(한글·한자 등).
const EVENT_NAME = /^(?:on|On)[\p{Lu}\p{Lt}\p{Lo}\p{Nd}_]/u;

export function checkJobflow(block) {
  const found = [];
  const seen = new Set();
  const add = (level, code, no, msg) => {
    const key = `${code}|${no}|${msg}`;
    if (!seen.has(key)) { seen.add(key); found.push(issue(level, code, no, msg)); }
  };

  let header = null;
  let first = true;
  let objectLine = 0;
  const declared = [];
  const declaredSet = new Set();
  const rels = [];
  const singles = [];

  for (const { no, text } of block.body) {
    const line = text.trim();
    if (!line) continue;
    if (first) {
      first = false;
      const h = /^(orchestrator|scope):(.*)$/.exec(line);
      if (h) {
        header = { kind: h[1], name: h[2].trim(), no };
        if (!header.name) add('FAIL', 'JF-HEADER', no, `헤더 이름이 비어 있다 — '${h[1]}: <이름>'`);
        if (header.name.includes('-->')) add('FAIL', 'JF-HEADER', no, "헤더 이름에 '-->' — 렌더러가 이 줄을 화살표로 읽는다");
        continue;
      }
      if (/^master\s*:/i.test(line)) {
        header = { kind: 'master', name: line.replace(/^master\s*:/i, '').trim(), no };
        add('WARN', 'JF-HEADER', no, 'master: 헤더 — 실제 조율자면 orchestrator:, 관찰 경계면 scope:로 의미를 밝힌다');
        continue;
      }
      if (/^(orchestrator|scope)\s*:/i.test(line)) {
        add('FAIL', 'JF-HEADER', no, `헤더는 소문자에 콜론을 붙여 'orchestrator:'·'scope:'로 쓴다 — '${clip(line)}'`);
        continue;
      }
      add('FAIL', 'JF-HEADER', no, `첫 줄이 orchestrator:/scope: 헤더가 아니다 — '${clip(line)}'`);
    } else if (/^(orchestrator|scope|master)\s*:/i.test(line)) {
      add('FAIL', 'JF-HEADER', no, '헤더 줄은 블록 첫 줄에 하나만 쓴다');
      continue;
    }

    const o = /^(objects?)\s*:(.*)$/i.exec(line);
    if (o) {
      if (!objectLine) objectLine = no;
      if (!/^object:/i.test(text)) {
        add('FAIL', 'JF-OBJECT', no, `렌더러는 줄 맨 앞의 'Object:'(대소문자 무관)만 객체 목록으로 읽는다 — '${clip(line)}'`);
      }
      let list = o[2];
      if (list.includes(':')) {
        add('FAIL', 'JF-OBJECT', no, "Object: 목록에 ':' — 렌더러는 두 번째 ':'부터 버린다");
        list = list.slice(0, list.indexOf(':'));
      }
      for (const part of list.split(',')) {
        const name = part.trim();
        if (!name) { add('WARN', 'JF-NAME', no, '빈 객체 이름 — 쉼표를 확인한다(빈 열이 생긴다)'); continue; }
        if (/\s/.test(name)) add('WARN', 'JF-NAME', no, `객체 이름에 공백: '${name}'`);
        else if (name.includes('.')) add('WARN', 'JF-NAME', no, `객체 이름에 '.': '${name}' — 렌더러는 첫 '.'에서 객체와 액션을 가른다`);
        if (declaredSet.has(name)) add('WARN', 'JF-NAME', no, `객체 '${name}' 중복 선언`);
        declared.push({ name, no });
        declaredSet.add(name);
      }
      continue;
    }

    if (line.includes('-->')) {
      const parts = line.split('-->');
      if (parts.length > 2) {
        add('FAIL', 'JF-OBJECT', no, `한 줄에 화살표가 ${parts.length - 1}개 — 렌더러는 첫 화살표의 양끝만 읽고 나머지를 버린다: '${clip(parts.slice(2).join('-->').trim(), 32)}'`);
      }
      let [left, right] = parts;
      if (hasLabelColon(left) || hasLabelColon(right)) {
        add('FAIL', 'JF-LABEL', no, LABEL_MSG);
        left = cutLabel(left);
        right = cutLabel(right);
      }
      rels.push({ no, from: endpoint(left), to: endpoint(right) });
      continue;
    }

    if (OTHER_ARROW.test(line)) {
      add('FAIL', 'JF-OBJECT', no, `화살표는 '-->'만 읽는다 — 이 줄은 분기 줄로 잘못 읽힌다: '${clip(line)}'`);
      continue;
    }
    let t = line;
    if (hasLabelColon(t)) { add('FAIL', 'JF-LABEL', no, LABEL_MSG); t = cutLabel(t).trim(); }
    if (!t.includes('.')) {
      add('FAIL', 'JF-OBJECT', no, `해석할 수 없는 줄 — 화살표도 'Object.분기' 꼴도 아니어서 렌더러가 무시한다: '${clip(t)}'`);
      continue;
    }
    singles.push({ no, ep: endpoint(t), known: declared.length });
  }

  if (first) {
    add('FAIL', 'JF-HEADER', block.open, '빈 jobflow 블록');
    return found;
  }
  const haveObjects = declared.length > 0;
  if (!objectLine) add('FAIL', 'JF-OBJECT', block.open, 'Object: 줄이 없다 — 그림에 나오는 객체를 모두 선언한다');
  else if (!haveObjects) add('FAIL', 'JF-OBJECT', objectLine, 'Object: 목록이 비어 있다');

  const used = new Set();
  const checkOnName = (ep, no) => {
    const last = ep.action.split('.').pop();
    if (/^on/i.test(last) && !EVENT_NAME.test(last)) {
      add('WARN', 'JF-ONNAME', no, `'${ep.obj}.${ep.action}' — 렌더러가 이벤트 모양으로 그리고 앞 두 글자를 지워 '${last.slice(2)}'만 보인다. 이벤트가 아니면 on·On으로 시작하지 않는 이름을 쓴다`);
    }
  };
  const checkSpaced = (ep, no) => {
    if (ep.spaced) add('FAIL', 'JF-OBJECT', no, `'${ep.obj} .' — 객체 이름과 '.' 사이 공백. 렌더러는 공백까지 객체 이름으로 읽어 다른(미선언) 객체로 그린다`);
    return ep.spaced;
  };
  for (const r of rels) {
    for (const [ep, side] of [[r.from, '왼쪽'], [r.to, '오른쪽']]) {
      if (!ep.obj) { add('FAIL', 'JF-OBJECT', r.no, `화살표 ${side} 끝이 비어 있다`); continue; }
      used.add(ep.obj);
      if (!checkSpaced(ep, r.no) && haveObjects && !declaredSet.has(ep.obj)) {
        add('FAIL', 'JF-OBJECT', r.no, `미선언 객체 '${ep.obj}' — Object: 목록에 없다`);
      }
      if (!ep.action) add('FAIL', 'JF-OBJECT', r.no, `'${ep.obj}' 뒤에 액션이 없다 — 'Object.Method' 꼴로 쓴다`);
      else checkOnName(ep, r.no);
    }
  }
  for (const s of singles) {
    used.add(s.ep.obj);
    if (!checkSpaced(s.ep, s.no) && haveObjects && !declared.slice(0, s.known).some((d) => d.name === s.ep.obj)) {
      add('FAIL', 'JF-OBJECT', s.no, declaredSet.has(s.ep.obj)
        ? `객체 '${s.ep.obj}'의 Object: 선언보다 앞에 쓴 분기 줄 — 렌더러가 이 줄을 무시한다`
        : `미선언 객체 '${s.ep.obj}' — 단독(분기) 줄의 객체도 Object:에 선언한다`);
    }
    if (!s.ep.action) add('FAIL', 'JF-OBJECT', s.no, `'${s.ep.obj}' 뒤에 액션이 없다 — 'Object.Method.값' 꼴로 쓴다`);
    else checkOnName(s.ep, s.no);
  }

  if (haveObjects) {
    for (const d of declared) {
      if (d.name && !used.has(d.name)) add('WARN', 'JF-UNUSED', d.no, `선언했지만 그림에 쓰지 않은 객체 '${d.name}'`);
    }
  }
  if (header && header.kind === 'orchestrator' && header.name) {
    if (haveObjects && !declaredSet.has(header.name)) add('WARN', 'JF-HEADER', header.no, `Object: 목록에 없는 orchestrator 이름 '${header.name}'`);
    const hits = new Map();
    for (const r of rels) {
      if (r.to.obj === header.name && r.to.action && !r.to.action.includes('.')) {
        if (!hits.has(r.to.action)) hits.set(r.to.action, []);
        hits.get(r.to.action).push(r.no);
      }
    }
    for (const [method, nos] of hits) {
      if (nos.length >= 2) {
        add('WARN', 'JF-RETURN', nos[1], `화살표 타깃 '${header.name}.${method}' ${nos.length}번(줄 ${nos.join(', ')}) — round-trip 의심. 합류·재호출이면 본문에 이유를 적는다`);
      }
    }
  }
  return found;
}

/* ------------------------------------------------------------- mermaid */

const ARROW_END = /(?:--+>|--+|==+>|==+|-\.+->|-\.+-|--[ox]|==[ox]|~~~)\s*$/;
const ID_CHAR = /[\p{L}\p{N}_]/u;
const CLOSER = { '[': ']', '(': ')', '{': '}', '/': '/', '\\': '\\' };
// '-- 글 -->' 꼴 엣지 라벨(따옴표 문자열은 미리 가린다). 여는 '--'·'=='·'-.' 앞뒤에 다른 선 기호가 붙으면
// ('---'·'-->'·'<--') 글 라벨이 아니다. 글은 따옴표·하이픈·'>'·'|'로 시작하지 않는다.
const EDGE_TEXT = /(?<![-=.<])(--|==|-\.)(?![->=.])[ \t]+([^\s"|>-][^|]*?)[ \t]+(-->|---|==>|===|\.->|\.-)/;

function skipQuoted(line, i) {
  const j = line.indexOf('"', i + 1);
  return j < 0 ? line.length : j + 1;
}

function blankQuoted(line) {
  return line.replace(/"[^"]*"/g, (m) => '"'.padEnd(m.length - 1, ' ') + '"');
}

function flowLabelProblems(line) {
  const probs = [];
  const n = line.length;
  let i = 0;
  while (i < n) {
    const c = line[i];
    if (c === '"') { i = skipQuoted(line, i); continue; }
    if (c === '|' && ARROW_END.test(line.slice(0, i))) {
      let k = i + 1;
      while (k < n && line[k] === ' ') k += 1;
      let e = k;
      while (e < n && line[e] !== '|') e = line[e] === '"' ? skipQuoted(line, e) : e + 1;
      if (line[k] !== '"') probs.push(`따옴표 없는 엣지 라벨 '|${clip(line.slice(i + 1, e), 30)}|' — 큰따옴표로 감싼다: '|"…"|'`);
      i = e + 1;
      continue;
    }
    if ((c === '[' || c === '(' || c === '{') && i > 0 && ID_CHAR.test(line[i - 1])) {
      let j = i + 1;
      if (c === '[' && ['[', '(', '/', '\\'].includes(line[j])) j += 1;
      else if (c === '(' && (line[j] === '(' || line[j] === '[')) { j += 1; if (line[j - 1] === '(' && line[j] === '(') j += 1; }
      else if (c === '{' && line[j] === '{') j += 1;
      let k = j;
      while (k < n && line[k] === ' ') k += 1;
      if (line[k] === '"') { i = k; continue; }
      let e = k;
      while (e < n && line[e] !== CLOSER[c]) e = line[e] === '"' ? skipQuoted(line, e) : e + 1;
      while (e + 1 < n && ')]}'.includes(line[e + 1])) e += 1; // (( ))·([ ]) 같은 겹 닫힘까지 보인다
      const id = (/[\p{L}\p{N}_-]+$/u.exec(line.slice(0, i)) || [''])[0];
      const opener = line.slice(i, j);
      const closer = [...opener].reverse().map((ch) => CLOSER[ch]).join('');
      probs.push(`따옴표 없는 노드 라벨 '${clip(id + line.slice(i, e + 1), 40)}' — 큰따옴표로 감싼다: '${id}${opener}"…"${closer}'`);
      i = e + 1;
      continue;
    }
    i += 1;
  }
  const t = EDGE_TEXT.exec(blankQuoted(line));
  if (t) probs.push(`따옴표 없는 엣지 라벨 '${clip(t[0].trim(), 30)}' — 큰따옴표로 감싼다: '${t[1]} "…" ${t[3]}'`);
  return probs;
}

export function checkMermaid(block) {
  const found = [];
  let type = null;
  let front = false;
  for (const { no, text } of block.body) {
    const t = text.trim();
    if (/<br\s*>/i.test(text)) found.push(issue('WARN', 'MERMAID', no, "self-closing이 아닌 '<br>' — '<br/>'로 쓴다"));
    if (type === null) {
      if (!t) continue;
      if (t === '---') { front = !front; continue; }
      if (front || t.startsWith('%%')) continue;
      type = t.split(/[\s;]+/)[0].toLowerCase();
      continue;
    }
    if (!/^(flowchart|graph)/.test(type)) continue;
    if (!t || t.startsWith('%%') || /^(classDef|class|style|linkStyle|click)\b/.test(t)) continue;
    for (const p of flowLabelProblems(t)) found.push(issue('WARN', 'MERMAID', no, p));
  }
  return found;
}

/* ---------------------------------------------------------------- 링크 */

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

const dirCache = new Map();
// 폴더의 항목 이름(디스크에 적힌 그대로). 읽지 못하면 null.
function listDir(dir) {
  if (!dirCache.has(dir)) {
    let names = null;
    try { names = fs.readdirSync(dir); } catch { names = null; }
    dirCache.set(dir, names);
  }
  return dirCache.get(dir);
}

const nfc = (s) => s.normalize('NFC');
const diskCache = new Map();
// 절대 경로 abs의 조각을 디스크에 적힌 이름으로 바꾼 경로. 대소문자를 구분하지 않는 파일 시스템에서 'repo'로 열리는
// 폴더 'Repo'는 'Repo'가 된다. 적힌 이름으로 실제로 열릴 때만 바꾸므로, 없는 조각과 대소문자를 구분하는 파일
// 시스템의 다른 이름은 그대로 남는다. 이름만 맞추고 심볼릭 링크는 따라가지 않는다.
function diskPath(abs) {
  if (diskCache.has(abs)) return diskCache.get(abs);
  const parent = path.dirname(abs);
  let result = abs;
  if (parent !== abs) {
    const dir = diskPath(parent);
    const name = path.basename(abs);
    const names = listDir(dir);
    let actual = name;
    if (names && !names.includes(name)) {
      const want = nfc(name);
      const alt = names.find((n) => nfc(n) === want) ?? names.find((n) => nfc(n).toLowerCase() === want.toLowerCase());
      if (alt !== undefined && fs.existsSync(path.join(dir, name))) actual = alt;
    }
    result = path.join(dir, actual);
  }
  diskCache.set(abs, result);
  return result;
}

// 대소문자를 구분하지 않는 파일 시스템에서만 열리는 경로인가: 디스크 이름과 대소문자가 다른 첫 조각의 실제 이름,
// 없으면 null. 유니코드 정규화만 다른 이름은 같은 이름으로 본다.
function caseMismatch(abs) {
  const typed = abs.split(path.sep);
  const disk = diskPath(abs).split(path.sep);
  const k = typed.findIndex((part, i) => nfc(part) !== nfc(disk[i]));
  return k < 0 ? null : disk[k];
}

function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function suggest(frag, anchors) {
  let best = null;
  let bestD = Infinity;
  for (const a of anchors) {
    const d = editDistance(frag, a);
    if (d < bestD) { best = a; bestD = d; }
  }
  return best !== null && bestD <= Math.max(3, Math.floor(frag.length * 0.3)) ? best : null;
}

const rootCache = new Map();
// dir에서 위로 올라가며 처음 만나는 .git(저장소의 폴더, worktree·submodule의 파일)이 있는 폴더. 없으면 null.
function gitRoot(dir) {
  if (!rootCache.has(dir)) {
    const parent = path.dirname(dir);
    rootCache.set(dir, fs.existsSync(path.join(dir, '.git')) ? dir : parent === dir ? null : gitRoot(parent));
  }
  return rootCache.get(dir);
}

function outsideOf(root, p) {
  const rel = path.relative(root, p);
  return rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
}

// 상대 링크 p가 저장소 루트를 넘는가: kind 'out' = 해석한 대상이 루트 밖, 'back' = 루트 위로 나갔다가 다시 들어온다.
// 넘지 않으면 null. from(문서 폴더)과 root는 디스크 이름 경로다. 경로 조각을 하나씩 따라가며 디스크 이름끼리
// 비교하므로, 대소문자를 구분하지 않는 파일 시스템에서 '../../repo/x'가 저장소 폴더 'Repo'로 풀리면 'back'이다.
// end = 해석한 대상의 디스크 이름 경로.
function crossesRoot(root, from, p) {
  let cur = from;
  let left = false;
  for (const seg of p.split('/')) {
    cur = diskPath(path.resolve(cur, seg));
    if (outsideOf(root, cur)) left = true;
  }
  const kind = outsideOf(root, cur) ? 'out' : left ? 'back' : null;
  return kind && { kind, end: cur };
}

const shownDir = (dir) => (path.relative(process.cwd(), dir) === '' ? '.' : displayPath(dir));

function checkLink(abs, doc, link, ctx) {
  let dest = link.dest.trim();
  if (dest.startsWith('<') && dest.endsWith('>')) dest = dest.slice(1, -1).trim();
  if (!dest) return [];
  if (/^[a-z][a-z0-9+.-]*:/i.test(dest) || dest.startsWith('//')) { ctx.skipped += 1; return []; }
  const hash = dest.indexOf('#');
  let p = hash < 0 ? dest : dest.slice(0, hash);
  const frag = hash < 0 ? '' : safeDecode(dest.slice(hash + 1));
  const qi = p.indexOf('?');
  if (qi >= 0) p = p.slice(0, qi);
  p = safeDecode(p);
  if (p.startsWith('/')) { ctx.skipped += 1; return []; }
  ctx.links += 1;

  const found = [];
  let info = doc;
  if (p) {
    // 문서 폴더는 디스크 이름으로 맞춘다 — 명령줄 경로의 대소문자 차이는 링크 탓이 아니므로 링크가 적은 조각만 본다.
    const from = diskPath(path.dirname(abs));
    const target = path.resolve(from, p);
    const root = gitRoot(from);
    if (!root) ctx.noRoot.add(abs);
    const cross = root ? crossesRoot(root, from, p) : null;
    if (cross && cross.kind === 'out') {
      found.push(issue('WARN', 'LINK-OUTSIDE', link.no, `저장소 루트를 벗어나는 링크: ${p} — 다른 컴퓨터에서 깨진다(저장소 루트 ${shownDir(root)}). 가이드 사본은 링크하지 말고 파일 이름과 절 제목으로 쓴다`));
    } else if (cross) {
      const inside = path.relative(from, cross.end).split(path.sep).join('/') || '.';
      found.push(issue('WARN', 'LINK-OUTSIDE', link.no, `저장소 루트 위로 나갔다가 돌아오는 링크: ${p} — 저장소 폴더 이름에 기대므로 다른 컴퓨터에서 깨진다. 저장소 안 경로로 쓴다: ${inside}`));
    }
    let st;
    try { st = fs.statSync(target); } catch { found.push(issue('FAIL', 'LINK', link.no, `대상 파일 없음: ${p}`)); return found; }
    const actual = caseMismatch(target);
    if (actual) {
      found.push(issue('FAIL', 'LINK', link.no, `대소문자 불일치: ${p} — 실제 이름 '${actual}'(대소문자를 구분하는 곳에서 깨진다)`));
      return found;
    }
    if (!frag || !st.isFile() || !/\.(md|markdown)$/i.test(target)) return found;
    info = ctx.docInfo(target);
    if (!info) return found;
  }
  if (!frag || info.anchors.has(frag)) return found;
  const hint = suggest(frag, info.anchors);
  found.push(issue('FAIL', 'ANCHOR', link.no, `앵커 없음: ${p}#${frag}${hint ? ` — 비슷한 제목 앵커: #${hint}` : ''}`));
  return found;
}

/* --------------------------------------------------------- 렌더러·파일 */

function findGenerate(mod) {
  const d = mod && mod.default;
  if (d && typeof d.generateSVG === 'function') return (src) => d.generateSVG(src);
  if (mod && typeof mod.generateSVG === 'function') return (src) => mod.generateSVG(src);
  return null;
}

async function importCopy(abs, ext) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-doc-check-'));
  const copy = path.join(dir, path.basename(abs).replace(/\.js$/i, ext));
  try {
    fs.copyFileSync(abs, copy);
    return await import(pathToFileURL(copy).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function loadRenderer(p) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) throw new UsageError(`렌더러 파일이 없다: ${p}`);
  let mod = null;
  let err = null;
  try { mod = await import(pathToFileURL(abs).href); } catch (e) { err = e; }
  if (!findGenerate(mod) && /\.js$/i.test(abs)) {
    // ESM 문법인데 .js를 CommonJS로 읽는 환경(package.json type·Node 버전)이면 .mjs, 그 반대면 .cjs 사본으로 다시 읽는다.
    for (const ext of ['.mjs', '.cjs']) {
      try {
        const m = await importCopy(abs, ext);
        if (findGenerate(m)) { mod = m; break; }
        mod = mod || m;
      } catch (e) {
        err = err || e;
      }
    }
  }
  const gen = findGenerate(mod);
  if (!gen) {
    const why = mod ? 'default 객체나 모듈에 generateSVG 함수가 없다' : firstLine(err);
    throw new UsageError(`렌더러를 읽지 못했다: ${p} — ${why} (ESM 렌더러면 .mjs 사본 경로를 주어도 된다)`);
  }
  return gen;
}

function collectFiles(args) {
  const files = [];
  const seen = new Set();
  const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const visit = (abs, explicit) => {
    let st;
    try { st = fs.statSync(abs); } catch {
      if (explicit) throw new UsageError(`경로가 없다: ${abs}`);
      return;
    }
    let real = abs;
    try { real = fs.realpathSync(abs); } catch { /* 그대로 */ }
    if (seen.has(real)) return;
    seen.add(real);
    if (st.isDirectory()) {
      for (const ent of fs.readdirSync(abs, { withFileTypes: true }).sort(byName)) {
        if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
        const child = path.join(abs, ent.name);
        if (ent.isDirectory() || ent.isSymbolicLink()) visit(child, false);
        else if (ent.isFile() && /\.md$/i.test(ent.name)) visit(child, false);
      }
    } else if (st.isFile() && (explicit || /\.md$/i.test(abs))) {
      files.push(abs);
    }
  };
  for (const a of args) visit(path.resolve(a), true);
  return files;
}

function commonDir(dirs) {
  let common = dirs[0].split(path.sep);
  for (const d of dirs.slice(1)) {
    const parts = d.split(path.sep);
    let k = 0;
    while (k < common.length && k < parts.length && common[k] === parts[k]) k += 1;
    common = common.slice(0, k);
  }
  return common.join(path.sep) || path.sep;
}

// SVG 파일 이름: 문서 basename. 같은 basename이 여럿이면 공통 상위 기준 상대 경로를 '__'로 잇는다.
function svgNames(files) {
  const groups = new Map();
  const base = (f) => path.basename(f).replace(/\.(md|markdown)$/i, '');
  for (const f of files) {
    const b = base(f);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b).push(f);
  }
  const names = new Map();
  for (const [b, group] of groups) {
    if (group.length === 1) { names.set(group[0], b); continue; }
    const common = commonDir(group.map((f) => path.dirname(f)));
    for (const f of group) {
      names.set(f, path.relative(common, f).replace(/\.(md|markdown)$/i, '').split(path.sep).join('__'));
    }
  }
  return names;
}

function displayPath(abs) {
  const rel = path.relative(process.cwd(), abs);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : abs;
}

function parseArgs(argv) {
  const opts = { renderer: null, out: null, strict: false, help: false, paths: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--') { opts.paths.push(...argv.slice(i + 1)); break; }
    if (a === '-h' || a === '--help') { opts.help = true; continue; }
    if (a === '--strict') { opts.strict = true; continue; }
    const m = /^--(renderer|out)(?:=(.*))?$/.exec(a);
    if (m) {
      const v = m[2] !== undefined ? m[2] : argv[(i += 1)];
      if (v === undefined || v === '' || (m[2] === undefined && v.startsWith('--'))) throw new UsageError(`--${m[1]}에 값이 없다`);
      opts[m[1]] = v;
      continue;
    }
    if (a.startsWith('-')) throw new UsageError(`알 수 없는 옵션: ${a}`);
    opts.paths.push(a);
  }
  if (!opts.help && opts.paths.length === 0) throw new UsageError('검사할 파일이나 폴더를 준다');
  return opts;
}

/* ---------------------------------------------------------------- 실행 */

const STDIO = { out: (s) => process.stdout.write(`${s}\n`), err: (s) => process.stderr.write(`${s}\n`) };

/** CLI 본체. argv는 옵션·경로 목록, io는 출력 함수. 종료 코드(0·1·2)를 돌려준다. */
export async function main(argv, io = STDIO) {
  let opts;
  let files;
  let render = null;
  let outDir = null;
  dirCache.clear(); // 같은 프로세스에서 다시 부를 때 지난 실행의 폴더 목록·디스크 이름·저장소 루트를 쓰지 않는다
  diskCache.clear();
  rootCache.clear();
  try {
    opts = parseArgs(argv);
    if (opts.help) { io.out(HELP); return 0; }
    files = collectFiles(opts.paths);
    if (files.length === 0) throw new UsageError('검사할 .md 파일이 없다');
    if (opts.renderer) {
      render = await loadRenderer(opts.renderer);
      outDir = path.resolve(opts.out || '.design-doc-check');
      try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) { throw new UsageError(`--out 폴더를 만들지 못했다: ${firstLine(e)}`); }
    } else if (opts.out) {
      io.err('design-doc-check: --out은 --renderer와 함께 쓸 때만 쓰인다');
    }
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    io.err(`design-doc-check: ${e.message}`);
    io.err(USAGE);
    return 2;
  }

  const parsed = new Map();
  for (const abs of files) {
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch (e) {
      io.err(`design-doc-check: 파일을 읽지 못했다: ${displayPath(abs)} — ${firstLine(e)}`);
      return 2;
    }
    parsed.set(abs, parseMarkdown(text));
  }
  const ctx = {
    blocks: 0, mermaid: 0, links: 0, skipped: 0, svg: 0,
    noRoot: new Set(), // 파일 상대 링크가 있는데 git 저장소 루트를 못 찾은 문서
    docInfo(abs) {
      if (!parsed.has(abs)) {
        let d = null;
        try { d = parseMarkdown(fs.readFileSync(abs, 'utf8')); } catch { d = null; }
        parsed.set(abs, d);
      }
      return parsed.get(abs);
    },
  };
  const names = render ? svgNames(files) : null;
  let fails = 0;
  let warns = 0;

  for (const abs of files) {
    const doc = parsed.get(abs);
    const found = [...doc.issues];
    let nth = 0;
    for (const b of doc.blocks) {
      if (b.lang === 'jobflow') {
        ctx.blocks += 1;
        nth += 1;
        found.push(...checkJobflow(b));
        if (render) {
          const src = b.body.map((l) => l.text).join('\n');
          let svg;
          try { svg = render(src); } catch (e) { found.push(issue('FAIL', 'RENDER', b.open, `렌더 예외: ${firstLine(e)}`)); continue; }
          if (typeof svg !== 'string' || !svg.trim()) { found.push(issue('FAIL', 'RENDER', b.open, '렌더 결과가 SVG 문자열이 아니다')); continue; }
          if (!/<svg[\s>]/i.test(svg)) svg = `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
          fs.writeFileSync(path.join(outDir, `${names.get(abs)}-${String(nth).padStart(2, '0')}.svg`), svg);
          ctx.svg += 1;
        }
      } else if (b.lang === 'mermaid') {
        ctx.mermaid += 1;
        found.push(...checkMermaid(b));
      }
    }
    for (const link of doc.links) found.push(...checkLink(abs, doc, link, ctx));

    found.sort((a, b) => a.line - b.line);
    const shown = displayPath(abs);
    for (const f of found) {
      io.out(`${f.level} ${f.code} ${shown}:${f.line} ${f.msg}`);
      if (f.level === 'FAIL') fails += 1; else warns += 1;
    }
  }

  if (ctx.noRoot.size > 0) {
    io.err(`design-doc-check: git 저장소 루트(.git)를 찾지 못한 문서 ${ctx.noRoot.size}편은 LINK-OUTSIDE를 보지 않았다`);
  }
  if (render && !opts.out && gitRoot(outDir)) {
    io.err(`design-doc-check: SVG 폴더가 git 저장소 안이다(--out 기본값): ${displayPath(outDir)} — 대상 저장소에서는 --out에 저장소 밖 임시 폴더를 준다(양식 §10)`);
  }
  io.out(`links=${ctx.links} skipped=${ctx.skipped} mermaid=${ctx.mermaid}${render ? ` svg=${ctx.svg} out=${displayPath(outDir)}` : ''}`);
  if (opts.strict && warns > 0) io.out(`strict: WARN ${warns}건을 실패로 센다`);
  io.out(`files=${files.length} blocks=${ctx.blocks} fail=${fails} warn=${warns}`);
  return fails > 0 || (opts.strict && warns > 0) ? 1 : 0;
}

const self = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
let isMain = invoked === self;
if (!isMain && invoked) {
  try { isMain = fs.realpathSync(invoked) === fs.realpathSync(self); } catch { isMain = false; }
}
if (isMain) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
    process.stderr.write(`design-doc-check: 내부 오류 — ${e && e.stack ? e.stack : e}\n`);
    process.exitCode = 2;
  });
}
