'use strict';
// 단계 실행기: 단계 하나를 화면에 펼치고, 끝나면 resolve 한다.
// ctx = { main, tray(content), trayEl(), refresh() }
// 단계 종류: say · choice · name · blocked · train · build · relic · battle (gender·alias는 원작에서 쓰던 것으로, 이 판에서는 쓰지 않는다)
(function () {
  const { h, wait, T, boldNodes } = G.util;
  const ui = G.ui;
  const steps = (G.steps = {});
  const S = () => G.save.state;

  // ───────── 공통: 아래 트레이의 버튼 ─────────
  function actionBtn(label, cls, onClick) {
    return h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { G.audio.tap(); onClick(); } } }, label);
  }
  steps.actionBtn = actionBtn;
  // Enter를 게임 진행에 써도 되는 때: 판·편람이 떠 있지 않고, 다른 버튼·입력 칸에 포커스가 없을 때
  function enterFree(e, own) {
    if (document.querySelector('.sheet-back, .overlay')) return false;
    const t = e.target;
    if (t && t !== own && t !== document.body && t.closest && t.closest('button, a, input, textarea, select, [role="button"], [tabindex]')) return false;
    return true;
  }
  steps.enterFree = enterFree;
  function nextButton(ctx, label = '다음 ▶', extra) {
    return new Promise((res) => {
      // 누르면 트레이를 비운다(다음 화면에 눌러도 아무 일 없는 단추가 남지 않게)
      const b = actionBtn(label, 'primary', () => { cleanup(); if (b.isConnected) ctx.tray(null); res(); });
      const key = (e) => {
        if (!b.isConnected) { cleanup(); return; } // 다른 화면으로 떠났으면 손을 뗀다
        if (e.key === 'Enter' && enterFree(e, b)) { e.preventDefault(); b.click(); }
      };
      document.addEventListener('keydown', key);
      function cleanup() { document.removeEventListener('keydown', key); }
      ctx.tray(h('div.actions', extra || null, b));
      setTimeout(() => b.focus({ preventScroll: true }), 30);
    });
  }
  steps.nextButton = nextButton;
  function feedback(box, kind, text) {
    box.innerHTML = '';
    box.appendChild(h('div.feedback.' + kind, boldNodes(text)));
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  steps.feedback = feedback;
  // 장면 이름은 { m:'sc_x', f:'sc_x_f' } 꼴로도 줄 수 있다(이 판에서는 문자열 하나만 쓴다)
  steps.sceneName = function (name) {
    if (!name || typeof name === 'string') return name;
    const st = S();
    if (st.branch === 'c' && 'c' in name) return name.c;
    return name[st.path || 'm'] || name.m;
  };
  function scene(name, cls = '') {
    name = steps.sceneName(name);
    if (!name) return document.createDocumentFragment(); // 이 길에는 그림이 없음: 붙여도 아무것도 나오지 않게
    const img = h('img', { src: 'assets/sc/' + name + '.webp', alt: '' });
    const box = h('div.scene' + cls, img);
    img.addEventListener('error', () => box.remove()); // 그림이 아직 없으면 자리를 비운다
    return box;
  }
  steps.scene = scene;

  // 조건: { path:'m'|'f', branch:'c'|['a','b'], notBranch:'c', disguised:true, mode:'deep', flag:{k:v} }
  steps.ok = function (when) {
    if (!when) return true;
    const st = S();
    if (when.path && st.path !== when.path) return false;
    if (when.branch) { const b = [].concat(when.branch); if (!b.includes(st.branch)) return false; }
    if (when.notBranch && st.branch === when.notBranch) return false;
    if (when.disguised != null && !!st.disguised !== when.disguised) return false;
    if (when.mode && st.mode !== when.mode) return false;
    if (when.doubtMin != null && st.doubtMax < when.doubtMin) return false;
    if (when.doubtBelow != null && st.doubtMax >= when.doubtBelow) return false;
    if (when.revealed != null && !!st.revealed !== when.revealed) return false;
    if (when.teacher && !st.teacher) return false;
    if (when.flag) for (const k in when.flag) if (st.flags[k] !== when.flag[k]) return false;
    return true;
  };

  // 상태 바꾸기: set(최상위 값), flags, abil(더하기), doubt(반발 더하기), conv(용어 열기), works(문헌 열기), my(나의 걸음)
  steps.apply = function (fx, ctx) {
    if (!fx) return;
    const st = S();
    if (fx.set) Object.assign(st, fx.set);
    if (fx.flags) Object.assign(st.flags, fx.flags);
    if (fx.abil) for (const k in fx.abil) {
      st.abil[k] = G.util.clamp((st.abil[k] || 0) + fx.abil[k], 1, 7);
      G.audio.grow();
      ui.toast(`${G.battle.STAT_HAN[k]} ${G.battle.STAT_KO[k]} +${fx.abil[k]}  →  ${st.abil[k]}`);
    }
    if (fx.doubt) {
      st.doubt = G.util.clamp(st.doubt + fx.doubt, 0, 100);
      st.doubtMax = Math.max(st.doubtMax, st.doubt);
      if (fx.doubt > 0) G.audio.doubt();
    }
    if (fx.conv) for (const c of [].concat(fx.conv)) st.conv[c] = true;
    if (fx.my && typeof fx.my === 'object') for (const k in fx.my) st.myStage[k] = T(fx.my[k]); // 선택지의 my(문자열)는 {pick} 자리에 쓰는 말이라 여기서 건너뛴다
    G.save.write();
    if (ctx) ctx.refresh();
  };

  // ───────── 한 줄(대사·서술·카드) ─────────
  // line: '서술' | { who, t, look } | { card:{kind,title,body,real} } | { conv:'id' } | { fiction:'id' } | { seal:'workId' } | { fx:{…} } | { scene:'sc_x' }
  steps.line = function (line, ctx) {
    const st = S();
    if (typeof line === 'string') line = { t: line };
    if (line.when && !steps.ok(line.when)) return null;
    if (line.fx) { steps.apply(line.fx, ctx); if (line.t == null && !line.who) return null; }
    if (line.scene) return scene(line.scene, '.short');
    if (line.card) return ui.card(line.card);
    if (line.conv) {
      const c = NOTES.conv[line.conv];
      st.conv[line.conv] = true; G.save.write();
      return ui.card({ kind: 'conv', title: c.title, body: c.body, real: c.real });
    }
    if (line.fiction) {
      const f = NOTES.fiction[line.fiction];
      st.seen[line.fiction] = true; G.save.write();
      return ui.card(Object.assign({ kind: 'fiction' }, f));
    }
    if (line.seal) return steps.sealCard(line.seal, line.t);
    if (line.gauge) return steps.gauge();
    if (!line.who) return h('div.para.narr.show', boldNodes(line.t));
    const isNarr = line.who === 'narrator';
    const name = G.util.who(line.who);
    return h('div.para.say.show' + (isNarr ? '.frame-say' : '') + (line.who === 'hero' ? '.me' : ''), { style: { '--pc': (PEOPLE[line.who] || {}).color || '#5a4a3a' } },
      h('div.who', ui.face(line.who, line.look)),
      h('div.bubble', h('span.nm', name, isNarr ? ui.tag('fiction') : null), boldNodes(line.t)));
  };

  // 마지막의 붉은 낙관: "이 길은 『○○』에 남았다"
  steps.sealCard = function (workId, text) {
    const w = WORKS[workId];
    G.app.unlock(workId, 7);
    return h('div.card.work.pathseal',
      h('span.seal-mark.big', w.seal || '原作'),
      h('span.kind', '문헌'),
      h('h3', `이 길은 『${w.title}』에 남았다`),
      h('p', boldNodes(text || w.pathNote || '')),
      h('p.small.muted', '게임 속 대사는 지어낸 것이에요. 실제 기록에 무엇이 남아 있는지는 편람의 문헌 도감에서 확인하세요.'));
  };

  // 반발 게이지
  steps.gauge = function () {
    const st = S();
    const bar = h('i', { style: { width: st.doubt + '%' } });
    return h('div.gauge-card', h('div.gl', '반발', ui.tag('fiction')), h('div.gbar' + (st.doubt >= 70 ? '.hot' : ''), bar), h('div.gv', st.doubt + ' / 100'));
  };

  // ───────── say: 한 줄씩 넘기며 읽기 ─────────
  steps.say = async function (step, ctx) {
    if (step.scene) ctx.main.appendChild(scene(step.scene));
    if (step.title) ctx.main.appendChild(h('h2.stitle', T(step.title)));
    const box = h('div.says');
    ctx.main.appendChild(box);
    const lines = step.lines.filter((l) => typeof l === 'string' || steps.ok(l.when));
    for (let i = 0; i < lines.length; i++) {
      const el = steps.line(lines[i], ctx);
      if (!el) continue;
      box.appendChild(el);
      G.audio.page();
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const last = i === lines.length - 1;
      await nextButton(ctx, last ? (step.next || '다음 ▶') : '▶');
    }
  };

  // ───────── choice: 고르기 ─────────
  steps.choice = async function (step, ctx) {
    const st = S();
    if (step.scene) ctx.main.appendChild(scene(step.scene, '.short'));
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    if (step.gauge && st.disguised) ctx.main.appendChild(steps.gauge());
    if (step.q) ctx.main.appendChild(steps.line(step.who ? { who: step.who, t: step.q } : { t: step.q }, ctx));
    const opts = step.options.filter((o) => steps.ok(o.when));
    const list = h('div.options');
    ctx.main.appendChild(list);
    list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // 맵에서 자리를 골라 이미 정한 선택(ctx.preset = { 단계 id: 선택지 번호 })
    const preset = ctx.preset && ctx.preset[step.id] != null ? step.options[ctx.preset[step.id]] : null;
    ctx.tray(preset ? h('div.tray-hint', '지도에서 고른 대로 이야기가 이어져요') : step.hint ? h('div.tray-hint', boldNodes(step.hint)) : null);
    const pick = await new Promise((res) => {
      opts.forEach((o, i) => {
        const b = h('button.opt', { type: 'button' },
          h('span.ot', boldNodes(o.t)), o.d ? h('span.od', boldNodes(o.d)) : null,
          o.abil ? h('span.oa', Object.keys(o.abil).map((k) => h('span.ab', G.battle.STAT_HAN[k] + ' ' + G.battle.STAT_KO[k] + ' +' + o.abil[k]))) : null,
          o.doubt ? h('span.oa', h('span.ab.doubt', '반발 ' + (o.doubt > 0 ? '+' : '') + o.doubt)) : null);
        b.addEventListener('click', () => { G.audio.pick(); res(o); });
        if (preset) b.disabled = true; // 맵에서 이미 골랐다
        list.appendChild(b);
        if (i === 0 && !preset) setTimeout(() => b.focus({ preventScroll: true }), 30);
      });
      if (preset && opts.includes(preset)) setTimeout(() => { G.audio.pick(); res(preset); }, 450);
    });
    list.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; if (opts[i] === pick) b.classList.add('picked'); else b.classList.add('dim'); });
    ctx.tray(null);
    steps.apply(pick, ctx);
    if (step.id) st.flags['pick:' + step.id] = opts.indexOf(pick);
    if (step.my) st.myStage[step.my.stage] = T(step.my.text.replace('{pick}', (pick.my || pick.t).replace(/\*\*/g, '')));
    G.save.write();
    const reply = (pick.reply || []).concat(step.after || []);
    const box = h('div.says'); ctx.main.appendChild(box);
    const lines = reply.filter((l) => typeof l === 'string' || steps.ok(l.when));
    for (let i = 0; i < lines.length; i++) {
      const el = steps.line(lines[i], ctx);
      if (!el) continue;
      box.appendChild(el); G.audio.page();
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await nextButton(ctx, i === lines.length - 1 ? '다음 ▶' : '▶');
    }
    if (!lines.length) await nextButton(ctx, '다음 ▶');
    if (st.doubt >= 100 && !step.noCrisis) await steps.crisis(ctx);
  };

  // 반발이 가득 찼을 때: 위기(게임 오버 없음, 이야기로 이어진다)
  steps.crisis = async function (ctx) {
    const st = S();
    st.crises++; st.doubt = 60; G.save.write();
    G.audio.play('tension');
    ctx.main.innerHTML = '';
    const lines = NOTES.crisis;
    const box = h('div.says'); ctx.main.appendChild(box);
    for (let i = 0; i < lines.length; i++) {
      const el = steps.line(lines[i], ctx); if (!el) continue;
      box.appendChild(el); G.audio.page(); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await nextButton(ctx, i === lines.length - 1 ? '다음 ▶' : '▶');
    }
    ctx.refresh();
  };

  // ───────── gender: 아들인가 딸인가 ─────────
  steps.gender = async function (step, ctx) {
    const st = S();
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    if (G.app.fixedPath) {
      st.path = G.app.fixedPath; G.save.write();
      ctx.main.appendChild(ui.card({ kind: 'note', title: '선생님이 정한 길', body: st.path === 'f' ? '이번 시간에는 **딸**로 태어난 주인공의 길을 걸어요.' : '이번 시간에는 **아들**로 태어난 주인공의 길을 걸어요.' }));
      await nextButton(ctx, '알겠어요 ▶');
      return;
    }
    const list = h('div.options.two');
    ctx.main.appendChild(list);
    const pick = await new Promise((res) => {
      for (const [v, t, d] of [['m', '첫째 길', ''], ['f', '둘째 길', '']]) {
        const b = h('button.opt.big', { type: 'button' }, h('span.ot', t), h('span.od', d));
        b.addEventListener('click', () => { G.audio.pick(); res(v); });
        list.appendChild(b);
      }
    });
    st.path = pick; G.save.write();
    ctx.refresh();
  };

  // ───────── name: 이름 짓기 ─────────
  steps.name = async function (step, ctx) {
    const st = S();
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    const sur = h('input.name-input.sur', { type: 'text', maxlength: 2, placeholder: '성', value: st.surname || '', 'aria-label': '성' });
    const giv = h('input.name-input', { type: 'text', maxlength: 3, placeholder: '이름', value: st.given || '', 'aria-label': '이름' });
    const prev = h('div.name-preview');
    const upd = () => { const s = sur.value.trim(), g = giv.value.trim(); prev.textContent = s && g ? `「${s}${g}전」` : '「　　전」'; };
    sur.addEventListener('input', upd); giv.addEventListener('input', upd); upd();
    const ex = NOTES.nameIdeas[st.path || 'm'];
    const chips = h('div.chips', ex.map(([n, m]) => h('button.chip-btn', { type: 'button', on: { click: () => { giv.value = n; upd(); G.audio.pick(); ui.toast(n + ' — ' + m); } } }, n)));
    const fb = h('div');
    ctx.main.append(h('div.name-box', h('div.row-gap.center', sur, giv), prev, h('p.small.muted.center', '누르면 이름 뜻을 볼 수 있어요(골라도, 직접 지어도 돼요)'), chips), fb);
    setTimeout(() => (st.surname ? giv : sur).focus(), 60);
    for (;;) {
      await nextButton(ctx, '이 이름으로 ▶');
      const s = sur.value.trim(), g = giv.value.trim();
      if (!/^[가-힣]{1,2}$/.test(s) || !/^[가-힣]{1,3}$/.test(g)) { feedback(fb, 'warn', '성은 한글 1~2자, 이름은 한글 1~3자로 적어 주세요.'); continue; }
      st.surname = s; st.given = g; G.save.write();
      break;
    }
    ctx.refresh();
  };

  // ───────── alias: 남장 이름 ─────────
  steps.alias = async function (step, ctx) {
    const st = S();
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    const inp = h('input.name-input', { type: 'text', maxlength: 3, placeholder: '남장 이름', value: st.alias || '', 'aria-label': '남장 이름' });
    const prev = h('div.name-preview');
    const upd = () => { prev.textContent = inp.value.trim() ? `${st.surname}${inp.value.trim()}` : `${st.surname}　　`; };
    inp.addEventListener('input', upd); upd();
    const chips = h('div.chips', NOTES.aliasIdeas.map(([n, m]) => h('button.chip-btn', { type: 'button', on: { click: () => { inp.value = n; upd(); G.audio.pick(); ui.toast(n + ' — ' + m); } } }, n)));
    const fb = h('div');
    ctx.main.append(h('div.name-box', h('div.row-gap.center', h('span.sur-fixed', st.surname), inp), prev, chips), fb);
    for (;;) {
      await nextButton(ctx, '이 이름으로 살아간다 ▶');
      const a = inp.value.trim();
      if (!/^[가-힣]{1,3}$/.test(a)) { feedback(fb, 'warn', '한글 1~3자로 적어 주세요.'); continue; }
      if (a === st.given) { feedback(fb, 'warn', '본래 이름과 다른 이름을 지어야 정체를 감출 수 있어요.'); continue; }
      st.alias = a; G.save.write(); break;
    }
    ctx.refresh();
  };

  // ───────── blocked: 막을 수 없는 장면 ─────────
  steps.blocked = async function (step, ctx) {
    const st = S();
    if (step.scene) ctx.main.appendChild(scene(step.scene, '.short'));
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    ctx.main.appendChild(steps.line({ t: step.q }, ctx));
    const list = h('div.options'); ctx.main.appendChild(list);
    const out = h('div.says'); ctx.main.appendChild(out);
    let tried = 0;
    const need = Math.min(step.need || 2, step.tries.length);
    await new Promise((res) => {
      step.tries.forEach((o) => {
        const b = h('button.opt', { type: 'button' }, h('span.ot', boldNodes(o.t)));
        b.addEventListener('click', async () => {
          if (b.disabled) return;
          b.disabled = true; b.classList.add('dim');
          G.audio.no();
          ui.shake(b);
          out.appendChild(steps.line({ t: o.reply }, ctx));
          out.lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          tried++;
          if (tried >= need) { list.querySelectorAll('.opt').forEach((x) => { x.disabled = true; x.classList.add('dim'); }); res(); }
        });
        list.appendChild(b);
      });
      ctx.tray(h('div.tray-hint', boldNodes(step.hint || '무엇이든 해 보세요.')));
    });
    ctx.tray(null);
    for (let i = 0; i < step.end.length; i++) {
      const el = steps.line(step.end[i], ctx); if (!el) continue;
      out.appendChild(el); G.audio.page(); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await nextButton(ctx, i === step.end.length - 1 ? '다음 ▶' : '▶');
    }
    if (step.my) steps.apply({ my: step.my }, ctx);
  };

  // ───────── train: 수련(몇 번 골라 능력치 올리기) ─────────
  steps.train = async function (step, ctx) {
    const st = S();
    if (step.scene) ctx.main.appendChild(scene(step.scene, '.short'));
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    const board = h('div.train');
    ctx.main.appendChild(board);
    const picked = [];
    for (let r = 0; r < step.rounds; r++) {
      board.innerHTML = '';
      board.appendChild(h('div.train-head', h('b', `수련 ${r + 1} / ${step.rounds}`), h('span.small.muted', '무엇을 닦을까요?')));
      const row = h('div.options.three');
      board.appendChild(row);
      const opts = Object.keys(step.opts).filter((k) => steps.ok(step.opts[k].when));
      const k = await new Promise((res) => {
        for (const key of opts) {
          const o = step.opts[key];
          const b = h('button.opt.stat.' + key, { type: 'button' }, h('span.han', G.battle.STAT_HAN[key]), h('span.ot', o.t), h('span.od', `${G.battle.STAT_KO[key]} ${st.abil[key]} → ${Math.min(7, st.abil[key] + 1)}`));
          b.addEventListener('click', () => { G.audio.pick(); res(key); });
          row.appendChild(b);
        }
      });
      picked.push(k);
      row.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; b.classList.add(opts[i] === k ? 'picked' : 'dim'); });
      steps.apply({ abil: { [k]: 1 } }, ctx);
      const lines = step.opts[k].reply;
      const line = lines[Math.min(r, lines.length - 1)];
      board.appendChild(steps.line(line, ctx));
      await nextButton(ctx, r === step.rounds - 1 ? '수련을 마친다 ▶' : '다음 수련 ▶');
    }
    st.flags.train = picked; G.save.write();
  };

  // ───────── build: 제자 원리 실습(직접 글자를 만들어 본다) ─────────
  //  mode 'gahoek' — 기본자 옆 빈칸에 가획자를 놓아 본다
  //  mode 'hapja'  — 첫소리·가운뎃소리·끝소리를 골라 한 글자로 모아 본다(부서법)
  //  놓을 때마다 st.flags.buildProg[단계id]에 적어 둔다.
  //  중간에 그만두고 나중에 이어 해도 놓은 것이 그대로 남는다.
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  // 낱자 셋을 한 글자로 모은다(유니코드 한글 조합)
  steps.compose = function (cho, jung, jong) {
    const c = CHO.indexOf(cho), v = JUNG.indexOf(jung), t = JONG.indexOf(jong || '');
    if (c < 0 || v < 0 || t < 0) return '';
    return String.fromCharCode(0xac00 + (c * 21 + v) * 28 + t);
  };
  // 첫소리 아래에 붙여 쓰는 가운뎃소리(부서법)
  const UNDER = ['ㆍ', 'ㅡ', 'ㅗ', 'ㅜ', 'ㅛ', 'ㅠ'];

  function buildProg(step) {
    const st = S();
    const all = st.flags.buildProg || (st.flags.buildProg = {});
    return all[step.id] || (all[step.id] = {});
  }

  steps.build = async function (step, ctx) {
    if (step.scene) ctx.main.appendChild(scene(step.scene, '.short'));
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    if (step.mode === 'hapja') await buildHapja(step, ctx);
    else await buildGahoek(step, ctx);
    const after = step.after || [];
    for (let i = 0; i < after.length; i++) {
      const el = steps.line(after[i], ctx); if (!el) continue;
      ctx.main.appendChild(el); G.audio.page(); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await nextButton(ctx, i === after.length - 1 ? '다음 ▶' : '▶');
    }
    if (step.my) steps.apply({ my: step.my }, ctx);
    const st = S();
    delete st.flags.buildProg[step.id];
    G.save.write();
  };

  // ── 가획: 기본자 옆 빈칸을 채운다 ──
  async function buildGahoek(step, ctx) {
    const p = buildProg(step);
    p.placed = p.placed || {};
    p.tries = p.tries || 0;
    const board = h('div.build'); ctx.main.appendChild(board);
    const fb = h('div'); ctx.main.appendChild(fb);
    let held = null;

    const keyOf = (ri, si) => 'r' + ri + 's' + si;
    const slotCount = step.rows.reduce((n, r) => n + r.fill.length, 0);
    const answers = [];
    step.rows.forEach((row, ri) => row.fill.forEach((ans, si) => answers.push({ k: keyOf(ri, si), ans })));

    function draw() {
      board.innerHTML = '';
      step.rows.forEach((row, ri) => {
        const line = h('div.build-row');
        line.append(h('span.build-name', row.name), h('span.build-base', row.base));
        row.fill.forEach((_, si) => {
          const k = keyOf(ri, si), v = p.placed[k];
          line.appendChild(h('span.build-arrow', '＋획'));
          const slot = h('button.build-slot' + (v ? '.full' : '') + (held && !v ? '.open' : ''),
            { type: 'button', 'aria-label': row.name + ' ' + (si + 1) + '번째 빈칸' }, v || '');
          slot.addEventListener('click', () => {
            G.audio.tap();
            if (v) { delete p.placed[k]; G.save.write(); draw(); return; }
            if (!held) return;
            p.placed[k] = held; held = null; G.save.write(); G.audio.pick(); draw();
          });
          line.appendChild(slot);
        });
        board.appendChild(line);
      });
      const used = Object.keys(p.placed).map((k) => p.placed[k]);
      const left = step.pool.slice();
      for (const u of used) { const i = left.indexOf(u); if (i >= 0) left.splice(i, 1); }
      const pool = h('div.build-pool');
      pool.appendChild(h('span.build-poolhead', left.length ? '놓을 글자' : '다 놓았어요'));
      for (const ch of left) {
        const chip = h('button.build-chip' + (held === ch ? '.held' : ''), { type: 'button' }, ch);
        chip.addEventListener('click', () => { G.audio.tap(); held = held === ch ? null : ch; draw(); });
        pool.appendChild(chip);
      }
      board.appendChild(pool);
      check.disabled = Object.keys(p.placed).length < slotCount;
    }

    const check = h('button.btn.primary', { type: 'button' }, '맞추어 보기');
    const reveal = h('button.btn.ghost', { type: 'button' }, '정답 보기');
    const teach = S().teacher ? h('button.btn.small.ghost', { type: 'button' }, '정답 채우기(선생님용)') : null;
    if (teach) teach.addEventListener('click', () => { answers.forEach((a) => { p.placed[a.k] = a.ans; }); held = null; draw(); check.click(); });
    draw();

    await new Promise((res) => {
      check.addEventListener('click', () => {
        G.audio.tap();
        p.tries++; G.save.write();
        const wrong = answers.filter((a) => p.placed[a.k] !== a.ans).map((a) => a.k);
        const slots = board.querySelectorAll('.build-slot');
        answers.forEach((a, i) => { if (slots[i]) slots[i].classList.toggle('bad', wrong.indexOf(a.k) >= 0); });
        if (!wrong.length) {
          if (p.tries === 1) G.save.stat('build', true);
          G.audio.ok(); ui.stamp('正');
          feedback(fb, 'ok', step.okText || '모두 제자리예요. 같은 자리에서 나는 소리끼리 **모양이 닮고**, 소리가 세질수록 **획이 하나 늘어납니다**.');
          slots.forEach((el) => { el.disabled = true; });
          board.querySelectorAll('.build-chip').forEach((el) => { el.disabled = true; });
          ctx.tray(null); res(); return;
        }
        if (p.tries === 1) { G.save.stat('build', false); G.save.wrong('build', step.wrongNote || '가획: 기본자에 획을 더해 만드는 글자'); }
        G.audio.no();
        feedback(fb, 'warn', '**' + (slotCount - wrong.length) + '개**가 제자리에 있어요. 붉게 표시된 칸을 다시 생각해 보세요.'
          + (p.tries >= 2 ? ' 막히면 **정답 보기**를 눌러도 괜찮아요.' : ''));
        if (p.tries >= 2) ctx.tray(h('div.actions', reveal, teach, check));
      });
      reveal.addEventListener('click', () => {
        G.audio.tap();
        p.helped = true; S().helped++;
        answers.forEach((a) => { p.placed[a.k] = a.ans; });
        held = null; G.save.write(); draw();
        feedback(fb, 'warn', '정답을 채웠어요. **왜 그 자리인지** 한 번 더 읽어 보고 «맞추어 보기»를 누르세요.');
      });
      ctx.tray(h('div.actions', teach, check));
    });
  }

  // ── 합자: 낱자를 모아 한 글자로 ──
  async function buildHapja(step, ctx) {
    const p = buildProg(step);
    p.done = p.done || 0;
    p.t = p.t || {};
    const board = h('div.build'); ctx.main.appendChild(board);
    const fb = h('div'); ctx.main.appendChild(fb);

    for (let i = p.done; i < step.targets.length; i++) {
      const t = step.targets[i];
      const sel = { cho: '', jung: '', jong: '' };
      board.innerHTML = ''; fb.innerHTML = '';
      board.appendChild(h('div.build-head', h('b', `모아쓰기 ${i + 1} / ${step.targets.length}`), h('span.small.muted', t.hint)));
      const view = h('div.build-view'); board.appendChild(view);
      const note = h('div.build-note'); board.appendChild(note);
      const rack = h('div.build-rack'); board.appendChild(rack);
      const rows = [['cho', '첫소리', step.cho], ['jung', '가운뎃소리', step.jung], ['jong', '끝소리', step.jong || ['']]];
      const check = h('button.btn.primary', { type: 'button' }, '이 글자로 한다');
      const teach = S().teacher ? h('button.btn.small.ghost', { type: 'button' }, '정답 고르기(선생님용)') : null;
      if (teach) teach.addEventListener('click', () => {
        for (const c of step.cho) for (const v of step.jung) for (const j of (step.jong || [''])) {
          if (steps.compose(c, v, j) === t.word) { sel.cho = c; sel.jung = v; sel.jong = j; }
        }
        draw(); check.click();
      });

      function draw() {
        const made = steps.compose(sel.cho, sel.jung, sel.jong);
        view.innerHTML = '';
        view.appendChild(h('span.build-made' + (made ? '' : '.empty'), made || '□'));
        note.textContent = !sel.jung ? ''
          : UNDER.indexOf(sel.jung) >= 0
            ? '가운뎃소리 ' + sel.jung + '는 첫소리 아래에 붙여 씁니다.'
            : '가운뎃소리 ' + sel.jung + '는 첫소리 오른쪽에 붙여 씁니다.';
        rack.innerHTML = '';
        for (const row of rows) {
          const key = row[0], label = row[1], list = row[2];
          const line = h('div.build-row');
          line.appendChild(h('span.build-name', label));
          for (const ch of list) {
            const on = sel[key] === ch;
            const b = h('button.build-chip' + (on ? '.held' : ''), { type: 'button' }, ch || '없음');
            b.addEventListener('click', () => { G.audio.pick(); sel[key] = ch; draw(); });
            line.appendChild(b);
          }
          rack.appendChild(line);
        }
        check.disabled = !(sel.cho && sel.jung);
      }
      draw();

      await new Promise((res) => {
        check.addEventListener('click', function onCheck() {
          G.audio.tap();
          p.t[i] = (p.t[i] || 0) + 1; G.save.write();
          const made = steps.compose(sel.cho, sel.jung, sel.jong);
          if (made === t.word) {
            G.save.stat('build', p.t[i] === 1);
            G.audio.ok(); ui.stamp('正');
            feedback(fb, 'ok', '「' + t.word + '」. ' + t.why);
            rack.querySelectorAll('.build-chip').forEach((el) => { el.disabled = true; });
            check.removeEventListener('click', onCheck);
            ctx.tray(null); res(); return;
          }
          if (p.t[i] === 1) G.save.wrong('build', '모아쓰기: ' + t.hint);
          G.audio.no();
          feedback(fb, 'warn', made ? '지금은 「' + made + '」이 되었어요. 세 소리를 다시 골라 보세요.' : '첫소리와 가운뎃소리를 골라야 한 글자가 됩니다.');
        });
        ctx.tray(h('div.actions', teach, check));
      });
      p.done = i + 1; G.save.write();
      if (i < step.targets.length - 1) await nextButton(ctx, '다음 글자 ▶');
    }
  }

  // ───────── relic: 임금이 내린 물건 고르기 ─────────
  steps.relic = async function (step, ctx) {
    const st = S();
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    const row = h('div.options.three'); ctx.main.appendChild(row);
    const R = BATTLE.relics;
    const k = await new Promise((res) => {
      for (const id of Object.keys(R)) {
        const r = R[id];
        const b = h('button.opt.relic', { type: 'button' }, h('span.han', r.han), h('span.ot', r.name), h('span.od', r.desc), h('span.od.small', G.battle.cardText(r)));
        b.addEventListener('click', () => { G.audio.pick(); res(id); });
        row.appendChild(b);
      }
    });
    st.relic = k; G.save.write();
    row.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; b.classList.add(Object.keys(R)[i] === k ? 'picked' : 'dim'); });
    G.audio.grow();
    const after = (step.after || []).concat(step.reply && step.reply[k] ? step.reply[k] : []);
    const box = h('div.says'); ctx.main.appendChild(box);
    for (let i = 0; i < after.length; i++) {
      const el = steps.line(after[i], ctx); if (!el) continue;
      box.appendChild(el); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await nextButton(ctx, i === after.length - 1 ? '다음 ▶' : '▶');
    }
    if (!after.length) await nextButton(ctx);
  };

  // ───────── battle: 논변(카드) ─────────
  steps.battle = async function (step, ctx) {
    const st = S();
    if (step.pre && step.pre.length) {
      if (step.scene) ctx.main.appendChild(scene(step.scene, '.short'));
      const box = h('div.says'); ctx.main.appendChild(box);
      for (let i = 0; i < step.pre.length; i++) {
        const el = steps.line(step.pre[i], ctx); if (!el) continue;
        box.appendChild(el); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        await nextButton(ctx, i === step.pre.length - 1 ? '싸운다 ⚔' : '▶');
      }
    }
    if (step.fiction && !st.seen[step.fiction]) {
      ctx.main.innerHTML = '';
      ctx.main.appendChild(steps.line({ fiction: step.fiction }, ctx));
      await nextButton(ctx, '전투 시작 ⚔');
    }
    const r = await G.battle.run(step.enemy, ctx, { tutorial: step.tutorial, intro: step.intro, bg: steps.sceneName(step.bg) });
    st.flags['battle:' + step.id] = r.turns; G.save.write();
    const box = h('div.says'); ctx.main.appendChild(box);
    const after = (step.after || []).filter((l) => typeof l === 'string' || steps.ok(l.when));
    for (let i = 0; i < after.length; i++) {
      const el = steps.line(after[i], ctx); if (!el) continue;
      box.appendChild(el); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await nextButton(ctx, i === after.length - 1 ? '다음 ▶' : '▶');
    }
    if (!after.length) await nextButton(ctx);
  };
})();
