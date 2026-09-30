// 이어 하기 검사(QA-001 재발 방지): 중간에 새로고침해도 보상을 두 번 받지 않는지
//  1) 5장 수련을 한 번 마친 뒤 새로고침 → 이어 하기 → 수련 2/3부터, 능력치는 그대로
//  2) 1장 선택지를 고른 뒤(보상 받음) 대답을 읽는 도중 새로고침 → 이어 하기 → 다시 고르면 앞의 보상은 되돌려짐
//   node resume.mjs
import { chromium } from 'playwright';
import { base } from './serve.mjs';
const BASE = await base();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const fail = (m) => errors.push(m);
const sum = (a) => a.mu + a.byeong + a.sul;
const st = () => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
const goalText = () => page.evaluate(() => (G.world.goal() || {}).text || '');
async function setup(fn) {
  await page.goto(BASE);
  await page.evaluate(fn);
  await page.goto(BASE);
}
async function resume() {
  await page.locator('button', { hasText: '이어 하기' }).click();
  await page.locator('.dlg-tray button.primary').click(); // 이어서
}
async function nextUntilClosed() {
  for (let i = 0; i < 30 && (await page.locator('.dlg').count()); i++) {
    const b = page.locator('.dlg-tray button.primary').filter({ visible: true });
    if (await b.count()) await b.last().click(); else await page.waitForTimeout(150);
    await page.waitForTimeout(120);
  }
}
// 대화창이 뜨면 넘기면서 맵 목표가 나올 때까지 기다린다(맵을 옮기는 동안에는 대화창이 늦게 뜬다)
async function waitGoal() {
  for (let i = 0; i < 150; i++) {
    const s = await page.evaluate(() => ({ dlg: !!document.querySelector('.dlg'), goal: !!(window.G && G.world.goal()) }));
    if (!s.dlg && s.goal) return;
    if (s.dlg) { const b = page.locator('.dlg-tray button.primary').filter({ visible: true }); if (await b.count()) await b.last().click(); }
    await page.waitForTimeout(150);
  }
  throw new Error('목표가 나오지 않음');
}

// 1) 수련
await setup(() => {
  localStorage.clear();
  const s = G.save.fresh();
  Object.assign(s, { path: 'm', surname: '홍', given: '대웅', look: 'youth', abil: { mu: 1, byeong: 1, sul: 1 } });
  for (const c of STORY.slice(0, 5)) { s.chDone[c.id] = true; for (const x of c.steps) s.done[x.id] = true; for (const b of QUESTS[c.id].beats) s.done['b:' + b.id] = true; }
  for (const id of ['c5-1', 'c5-2', 'c5-3', 'c5-3b', 'b:b5-1', 'b:b5-2', 'b:b5-3', 'b:b5-3b']) s.done[id] = true;
  localStorage.setItem('jeongeum-road-v1', JSON.stringify(s));
});
await resume();
await waitGoal(); // 정인지의 첫말을 넘기고
if (!(await goalText()).includes('1/3')) fail('수련 첫 목표가 1/3이 아님: ' + (await goalText()));
await page.evaluate(() => G.world.test.complete());
await nextUntilClosed();
await waitGoal();
const a1 = (await st()).abil;
if (sum(a1) !== 4) fail('수련 1회 뒤 능력치 합이 4가 아님: ' + JSON.stringify(a1));
if (!(await goalText()).includes('2/3')) fail('수련 1회 뒤 목표가 2/3이 아님');
await page.reload();
await resume();
await page.waitForTimeout(900);
if (await page.locator('.dlg .say').count()) fail('이어 하기에서 정인지의 첫말이 다시 나옴');
await waitGoal();
const g2 = await goalText();
const a2 = (await st()).abil;
if (!g2.includes('2/3')) fail('이어 하기 뒤 수련이 2/3부터가 아님: ' + g2);
if (sum(a2) !== 4) fail('이어 하기 뒤 능력치가 바뀜: ' + JSON.stringify(a2));
for (let r = 0; r < 2; r++) { await page.evaluate(() => G.world.test.complete()); await nextUntilClosed(); await page.waitForTimeout(200); }
const s3 = await st();
if (sum(s3.abil) !== 6) fail('수련 세 번 뒤 능력치 합이 6이 아님: ' + JSON.stringify(s3.abil));
if (!s3.flags.train || s3.flags.train.length !== 3) fail('수련 기록이 3개가 아님: ' + JSON.stringify(s3.flags.train));
if (s3.flags.trainProg) fail('수련 진행 기록이 남아 있음');
console.log('수련 이어 하기:', JSON.stringify({ first: a1, afterReload: a2, goal: g2, final: s3.abil, train: s3.flags.train }));

// 2) 선택 도중
await setup(() => {
  localStorage.clear();
  const s = G.save.fresh();
  Object.assign(s, { path: 'm', surname: '홍', given: '대웅', abil: { mu: 1, byeong: 1, sul: 1 } });
  s.chDone.ch0 = true; for (const x of STORY[0].steps) s.done[x.id] = true; for (const b of QUESTS.ch0.beats) s.done['b:' + b.id] = true;
  for (const id of ['c1-1', 'b:b1-1']) s.done[id] = true;
  localStorage.setItem('jeongeum-road-v1', JSON.stringify(s));
});
await resume();
await waitGoal();
await page.evaluate(() => G.world.test.complete()); // 신문고
await page.waitForSelector('.dlg .opt:not([disabled])');
await page.locator('.dlg .opt').nth(0).click(); // 소리 나는 대로 적을 길: 聲 +1
await page.waitForTimeout(500);
const b1 = (await st()).abil;
if (b1.mu !== 2) fail('첫 선택의 보상이 없음: ' + JSON.stringify(b1));
await page.reload(); // 대답을 읽는 도중
await resume();
await waitGoal();
await page.evaluate(() => G.world.test.complete());
await page.waitForSelector('.dlg .opt:not([disabled])');
const b2 = (await st()).abil;
if (b2.mu !== 1) fail('다시 고르기 전에 앞의 보상이 되돌려지지 않음: ' + JSON.stringify(b2));
await page.locator('.dlg .opt').nth(1).click(); // 우리말과 한자가 맞지 않음: 理 +1
await nextUntilClosed();
const b3 = await st();
if (b3.abil.mu !== 1 || b3.abil.byeong !== 2) fail('다시 고른 뒤 능력치가 맞지 않음: ' + JSON.stringify(b3.abil));
if (b3.flags['snap:c1-2']) fail('단계 보상 기록이 남아 있음');
console.log('선택 이어 하기:', JSON.stringify({ firstPick: b1, beforeRepick: b2, final: b3.abil, care: b3.flags.care }));

// 3) 제자 원리 실습 도중(가획) — 몇 개 놓고 껐다가 이어 하면 놓은 것이 그대로 남는다
await setup(() => {
  localStorage.clear();
  const s = G.save.fresh();
  Object.assign(s, { path: 'm', surname: '홍', given: '대웅', look: 'youth', teacher: true, abil: { mu: 1, byeong: 1, sul: 1 } });
  for (const c of STORY.slice(0, 5)) { s.chDone[c.id] = true; for (const x of c.steps) s.done[x.id] = true; for (const b of QUESTS[c.id].beats) s.done['b:' + b.id] = true; }
  for (const id of ['c4-1', 'c4-2', 'b:b4-1', 'b:b4-2']) s.done[id] = true;
  delete s.chDone.ch4;
  for (const x of STORY.find((c) => c.id === 'ch4').steps) if (!['c4-1', 'c4-2'].includes(x.id)) delete s.done[x.id];
  for (const b of QUESTS.ch4.beats) if (!['b4-1', 'b4-2'].includes(b.id)) delete s.done['b:' + b.id];
  localStorage.setItem('jeongeum-road-v1', JSON.stringify(s));
});
await resume();
await waitGoal();
await page.evaluate(() => G.world.test.complete());
await page.waitForSelector('.build-slot');
// 앞말을 다 넘긴 뒤 글자 두 개를 놓는다: ㅋ(어금닛소리), ㄷ(혓소리 첫 칸)
for (const ch of ['ㅋ', 'ㄷ']) {
  await page.locator('.build-chip', { hasText: new RegExp('^' + ch + '$') }).first().click();
  await page.locator('.build-slot:not(.full)').first().click();
  await page.waitForTimeout(120);
}
const mid = await st();
const placed = mid.flags.buildProg && mid.flags.buildProg['c4-2b'] && mid.flags.buildProg['c4-2b'].placed;
if (!placed || Object.keys(placed).length !== 2) fail('놓은 글자가 저장되지 않음: ' + JSON.stringify(placed));
await page.reload();
await resume();
await waitGoal();
await page.evaluate(() => G.world.test.complete());
await page.waitForSelector('.build-slot.full');
const back = await page.locator('.build-slot.full').allTextContents();
if (back.join('') !== 'ㅋㄷ') fail('이어 하기 뒤 놓은 글자가 사라짐: ' + JSON.stringify(back));
// 나머지를 선생님용으로 채워 마치면 진행 기록이 지워진다
await page.locator('button', { hasText: '정답 채우기(선생님용)' }).click().catch(() => {});
await page.waitForTimeout(400);
await nextUntilClosed();
await page.waitForTimeout(300);
const done = await st();
if (done.flags.buildProg && done.flags.buildProg['c4-2b']) fail('실습 진행 기록이 남아 있음');
console.log('실습 이어 하기:', JSON.stringify({ midPlaced: Object.keys(placed).length, afterReload: back }));

console.log(errors.length ? '실패:\n - ' + errors.join('\n - ') : '이어 하기 검사 통과');
await browser.close();
process.exit(errors.length ? 1 : 0);
