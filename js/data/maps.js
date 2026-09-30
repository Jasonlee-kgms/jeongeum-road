'use strict';
// 맵(선생님이 고쳐도 되는 파일)
//  - 땅은 글자 격자로 만든다. 한 칸 = 32px. 글자 뜻은 js/game/tiles.js 맨 위에 있다.
//    '.' 풀 ',' 꽃밭 'm' 짙은 풀 ':' 흙길 '=' 박석 '_' 마루 's' 모래 'e' 맨흙 'p' 밭 'r' 붉은 깔개 'b' 다리
//    막힌 칸: '#' 담장 'f' 울타리 'c' 바위 벼랑 'h' 산울타리 '~' 물 'x' 바깥
//  - props: [그림, 왼쪽 칸 x, 바닥 칸 y, {hit:'표적 이름', walk:true(지나갈 수 있음), flat:true(바닥에 깔림)}]
//  - spots: 살피거나 밟는 자리 { x, y, w, h, name, act(단추 글자), look(살피면 나오는 말), hint(알림) }
//  - npcs: 늘 있는 사람들(목표와 상관없이 말을 걸 수 있다) { sp, x, y, dir, name, talk:[말, 말…], wander(돌아다니는 칸 수), chs:['ch0'](이 장에서만) }
//    talkBy:{ ch3:[말…] }를 주면 그 장에서는 그 말을 한다(이야기 시점에 맞게).
//    x, y는 칸 번호. 사람의 발은 그 칸 아래쪽 가운데에 선다(13.5처럼 반 칸도 된다).
(function () {
  // 격자 만들기: 채우기 → 사각형 → 점
  function mk(w, hgt, base, ops) {
    const g = Array.from({ length: hgt }, () => Array(w).fill(base));
    const set = (x, y, c) => { if (y >= 0 && y < hgt && x >= 0 && x < w) g[y][x] = c; };
    for (const op of ops) {
      const [k] = op;
      if (k === 'rect') { const [, x, y, rw, rh, c] = op; for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) set(i, j, c); }
      else if (k === 'frame') { const [, x, y, rw, rh, c] = op; for (let i = x; i < x + rw; i++) { set(i, y, c); set(i, y + rh - 1, c); } for (let j = y; j < y + rh; j++) { set(x, j, c); set(x + rw - 1, j, c); } }
      else if (k === 'border') { const [, c] = op; for (let i = 0; i < w; i++) { set(i, 0, c); set(i, hgt - 1, c); } for (let j = 0; j < hgt; j++) { set(0, j, c); set(w - 1, j, c); } }
      else if (k === 'dots') { const [, c, pts] = op; for (const [x, y] of pts) set(x, y, c); }
    }
    return g.map((r) => r.join(''));
  }

  window.MAPS = {
    // ───────── 서장·1장·2장·7장 · 한양 저잣거리 ─────────
    market: {
      name: '한양 저잣거리', music: 'market', spawn: [11.5, 17, 'up'],
      grid: mk(30, 20, '.', [
        ['rect', 0, 0, 30, 6, '.'],
        ['rect', 1, 6, 28, 4, '='],
        ['rect', 17, 10, 11, 5, ':'],
        ['rect', 11, 10, 2, 9, ':'],
        ['rect', 13, 14, 5, 1, ':'],
        ['dots', ',', [[2, 1], [3, 1], [27, 1], [26, 2], [2, 15], [3, 16], [27, 16], [26, 17], [20, 17], [21, 17], [8, 16]]],
        ['border', 'h'],
      ]),
      props: [
        ['pr_house', 1, 5], ['pr_cottage', 8, 5], ['pr_house', 13, 5], ['pr_cottage', 20, 5], ['pr_cottage', 25, 5],
        ['pr_stall', 1.5, 12], ['pr_stall', 5, 12], ['pr_jars', 8.2, 11.6],
        ['pr_banner', 14.3, 6.2, { walk: true }], ['pr_banner', 21.3, 6.2, { walk: true }], ['pr_bookshelf', 26, 6.2],
        ['pr_lantern', 16.3, 10.5], ['pr_lantern', 27.3, 10.5],
        ['pr_well', 14, 17.2], ['pr_willow', 1, 18.2], ['pr_pine', 25.5, 18.2], ['pr_cart', 21.5, 18], ['pr_bush', 6, 18.4], ['pr_flowers', 8, 17.6, { flat: true }],
      ],
      spots: {
        scribe: { x: 9, y: 5, w: 2, h: 1, name: '대서소', act: '살피기', look: ['**대서소(代書所)**라고 쓴 나무 패가 걸려 있다. 글을 모르는 사람을 대신해 삯을 받고 문서를 써 주는 자리다.'] },
        idu: { x: 14, y: 5, w: 2, h: 1, name: '관청에서 붙인 방문 — 이두', act: '읽어 보기', mh: 40 },
        gugyeol: { x: 21, y: 5, w: 2, h: 1, name: '절에서 펴낸 불경 — 구결', act: '읽어 보기', mh: 40 },
        hanja: { x: 25, y: 5, w: 2, h: 1, name: '글방에 걸린 한문 책 — 한자', act: '읽어 보기', mh: 40 },
        well: { x: 14, y: 17, w: 1, h: 1, look: ['저잣거리 한복판의 우물이다. 아침마다 사람들이 모여 이야기를 나눈다.'] },
      },
      npcs: {
        scribeman: { sp: 'sp_joseon_man', x: 9.5, y: 6.2, dir: 'down', name: '대서인', talk: [
          ['소지(訴狀) 한 장에 쌀 두 되요. 비싸다 마시오. 글 아는 사람이 몇이나 된다고.'],
          ['말은 우리말로 하는데 글은 한자로 적어야 하니, 쓰는 나도 옮기다 뜻이 어긋날 때가 있소.'],
        ] },
        widow1: { sp: 'sp_joseon_woman', x: 7.5, y: 8.4, dir: 'right', name: '아낙', talk: [
          ['남의 땅을 빼앗겼는데 관가에 낼 글을 쓸 줄 몰라 삯을 주고 맡겼지요. 그런데 뭐라 적혔는지 저는 읽지도 못한답니다.'],
        ] },
        villager1: { sp: 'sp_villager_m', x: 19.5, y: 13, dir: 'up', name: '지게꾼', talk: [
          ['관청에 방(榜)이 붙어도 읽을 줄을 알아야지요. 늘 남이 읽어 주기를 기다린다오.'],
        ] },
        villager2: { sp: 'sp_villager_w', x: 22.5, y: 13.2, dir: 'up', name: '장사치', talk: [
          ['셈은 숫자로 적으면 되는데, 사람 이름이며 약조한 말이며는 적을 재간이 없어요.'],
        ] },
        scholar: { sp: 'sp_courtier', x: 15, y: 7.5, dir: 'left', name: '지나가던 선비', wander: 3, talk: [
          ['(헛기침) 에헴. 글이란 본디 오래 배워야 하는 것이오. 아무나 쉽게 익히는 글이 어디 있겠소?'],
        ], talkBy: { ch7: [['…열흘 만에 익혔소. 내 평생 한자를 배운 세월이 억울할 지경이오.']] } },
        monk: { sp: 'sp_monk', x: 21.5, y: 7.4, dir: 'down', name: '스님', talk: [
          ['한문 경전에 토를 달아 읽습니다. 그래도 글 모르는 신도에게는 늘 말로 풀어 드려야 하지요.'],
        ] },
      },
    },

    // ───────── 1장·6장 · 경복궁 근정전 ─────────
    palace: {
      name: '경복궁 근정전', music: 'palace', spawn: [13.5, 19, 'up'],
      grid: mk(28, 22, '=', [
        ['rect', 13, 9, 2, 12, 'r'],
        ['rect', 1, 1, 5, 7, '.'], ['rect', 22, 1, 5, 7, '.'],
        ['dots', ',', [[2, 2], [4, 5], [24, 3], [25, 6]]],
        ['border', '#'],
      ]),
      props: [
        ['pr_palace', 9.5, 8.1],
        ['pr_pine', 1.5, 7.2], ['pr_plum', 23, 7.2], ['pr_bush', 4.5, 5],
        ['pr_lantern', 11, 12.2], ['pr_lantern', 16.3, 12.2], ['pr_lantern', 11, 17.2], ['pr_lantern', 16.3, 17.2],
        ['pr_drum', 2.5, 15.5], ['pr_banner', 12, 20.2, { walk: true }], ['pr_banner', 15, 20.2, { walk: true }], ['pr_jars', 23, 18],
      ],
      spots: {
        out: { x: 12, y: 20, w: 4, h: 1, name: '대궐 문' },
        drum: { x: 2, y: 16, w: 2, h: 1, name: '신문고', act: '살피기', mh: 40 },
      },
      npcs: {
        c1: { sp: 'sp_courtier', x: 10, y: 13.2, dir: 'right', name: '신하', talk: [['조정의 문서는 모두 한문으로 오갑니다. 아래에 내려가면 이두로 옮겨 적지요.']],
          talkBy: { ch6: [['집현전에서 상소가 올라왔다 합니다. 부제학 어른을 비롯해 일곱 분이 이름을 올리셨다지요.']] } },
        c2: { sp: 'sp_courtier', x: 17, y: 13.2, dir: 'left', name: '신하', talk: [['(소곤소곤) 요사이 전하께서 밤늦도록 무언가를 살피신다는데, 아무도 무엇인지 모른다오.']],
          talkBy: { ch6: [['(소곤소곤) 전하께서 크게 노하셨다고 합니다. 어전에서 직접 물으시겠다는군요.']] } },
        c3: { sp: 'sp_courtier', x: 10, y: 15.2, dir: 'right', name: '형조 관원', talk: [['옥에 갇힌 이가 제 죄목이 무엇인지도 모르는 일이 허다합니다. 읽지를 못하니까요.']] },
        c4: { sp: 'sp_courtier', x: 17, y: 15.2, dir: 'left', name: '예조 관원', talk: [['『삼강행실도』를 그림까지 넣어 펴냈습니다만, 글이 한문이라 결국 누가 읽어 주어야 합니다.']] },
        lady: { sp: 'sp_court_lady', x: 21, y: 9.4, dir: 'down', name: '나인', talk: [['대궐 안에서는 뛰지 마셔요!']] },
        guard1: { sp: 'sp_soldier', x: 11, y: 19.2, dir: 'right', name: '문지기', talk: [['대궐 문을 지키고 있소.']] },
        guard2: { sp: 'sp_soldier', x: 16, y: 19.2, dir: 'left', name: '문지기', talk: [['수상한 자는 들이지 않소.']] },
      },
    },

    // ───────── 3장 · 집현전 ─────────
    jiphyeon: {
      name: '집현전', music: 'court', spawn: [17.5, 15, 'up'],
      grid: mk(34, 26, '.', [
        ['rect', 0, 0, 8, 1, 'c'], ['rect', 0, 0, 1, 9, 'c'],
        ['rect', 28, 1, 5, 8, 'm'],
        ['frame', 8, 2, 20, 12, '#'],
        ['rect', 9, 3, 18, 10, '='],
        ['rect', 17, 13, 2, 1, ':'],
        ['rect', 17, 14, 2, 11, ':'],
        ['rect', 1, 18, 27, 2, ':'],
        ['rect', 2, 1, 2, 17, ':'],
        ['rect', 27, 20, 6, 1, 's'], ['rect', 27, 21, 2, 4, 's'],
        ['rect', 29, 21, 5, 5, '~'],
        ['rect', 3, 21, 5, 4, 'm'],
        ['dots', ',', [[5, 3], [6, 4], [5, 12], [6, 13], [21, 16], [22, 16], [24, 22], [25, 23], [13, 16], [30, 10], [31, 11]]],
        ['border', 'h'],
        ['rect', 0, 0, 8, 1, 'c'],
      ]),
      props: [
        ['pr_house', 14, 7], ['pr_cottage', 9.3, 7.2], ['pr_shrine', 22.5, 6.6],
        ['pr_banner', 11.3, 11.2, { walk: true }], ['pr_banner', 17.3, 11.2, { walk: true }], ['pr_banner', 23.3, 11.2, { walk: true }],
        ['pr_plum', 10, 12.3], ['pr_lantern', 16, 13.8], ['pr_lantern', 19, 13.8],
        ['pr_table', 4.5, 22.2], ['pr_bookshelf', 7, 22.2],
        ['pr_cottage', 9, 22.3],
        ['pr_boulder', 30, 5.4], ['pr_pine', 29, 3], ['pr_maple', 4.5, 8.5], ['pr_pine', 5, 16],
        ['pr_willow', 24.5, 25.2], ['pr_reeds', 27.2, 22.2], ['pr_reeds', 28, 24.4], ['pr_reeds', 31.5, 21], ['pr_bamboo', 30.5, 18.8],
        ['pr_bush', 12, 15.8], ['pr_bush', 23, 15.8], ['pr_stump', 1.5, 22],
      ],
      spots: {
        hall: { x: 16, y: 7, w: 2, h: 1, name: '집현전 본채', act: '들어가기' },
        archive: { x: 23, y: 7, w: 2, h: 1, name: '장서각', act: '살피기', mh: 40 },
        lip: { x: 11, y: 11, w: 2, h: 1, name: '입술에서 나는 소리 — ㅁ ㅂ ㅍ', act: '소리 내 보기', mh: 40 },
        tongue: { x: 17, y: 11, w: 2, h: 1, name: '혀가 닿아 나는 소리 — ㄴ ㄷ ㅌ', act: '소리 내 보기', mh: 40 },
        throat: { x: 23, y: 11, w: 2, h: 1, name: '목구멍에서 나는 소리 — ㅇ ㅎ', act: '소리 내 보기', mh: 40 },
        study: { x: 9, y: 23, w: 3, h: 1, name: '강독청', act: '들여다보기', mh: 36 },
        gate: { x: 17, y: 13, w: 2, h: 2, name: '문 밖' },
      },
      npcs: {
        clerk: { sp: 'sp_servant', x: 12, y: 9.4, dir: 'down', name: '집현전 서리', chs: ['ch3', 'ch4'], talk: [
          ['집현전은 임금께서 학문을 맡기신 곳입니다. 여기서 책을 읽고, 옛일을 살피고, 임금께 아뢸 글을 짓지요.'],
        ] },
        seongsam: { sp: 'sp_courtier', x: 20, y: 9.4, dir: 'down', name: '성삼문', chs: ['ch3', 'ch4'], talk: [
          ['새로 들어오셨다지요? 저는 성삼문이라 합니다. 요사이 전하께서 젊은 학사들만 따로 부르신다는 말이 있는데…'],
          ['부제학 어른께는 아직 말씀드리지 않는 편이 좋겠습니다.'],
        ] },
        sinsuk: { sp: 'sp_yunseon', x: 24, y: 9.4, dir: 'down', name: '신숙주', chs: ['ch3', 'ch4'], talk: [
          ['신숙주입니다. 저는 운서(韻書)를 보고 있었습니다. 한자의 소리를 갈래별로 모아 적은 책이지요.'],
          ['우리나라 한자음이 중국과 많이 달라졌습니다. 소리를 적을 방법이 있다면 이런 것도 바로잡을 수 있을 텐데요.'],
        ] },
        elder: { sp: 'sp_courtier', x: 15, y: 16.2, dir: 'down', name: '나이 든 학사', wander: 2, chs: ['ch3', 'ch4'], talk: [
          ['집현전에서는 임금의 일에도 옳지 않다 싶으면 상소를 올립니다. 그것이 이 자리의 소임이지요.'],
        ] },
      },
    },

    // ───────── 4장·5장·7장 · 경복궁 후원의 별채 ─────────
    annex: {
      name: '후원의 별채', music: 'mountain', spawn: [14.5, 20, 'up'], combat: false,
      grid: mk(30, 24, 'm', [
        ['rect', 1, 1, 28, 22, '.'],
        ['rect', 10, 1, 10, 6, '='],
        ['rect', 2, 8, 7, 6, '='],
        ['rect', 21, 8, 7, 6, ':'],
        ['rect', 8, 14, 14, 8, '='],
        ['rect', 14, 7, 2, 7, ':'],
        ['rect', 24, 17, 4, 4, '~'],
        ['rect', 1, 1, 4, 5, 'c'], ['rect', 25, 1, 4, 4, 'c'],
        ['dots', ',', [[5, 16], [4, 18], [23, 15], [3, 20], [26, 22]]],
        ['border', 'c'],
      ]),
      props: [
        ['pr_shrine', 13.5, 4.2], ['pr_table', 18.3, 5.6], ['pr_chest', 10.5, 5.6],
        ['pr_drum', 3.5, 10.4], ['pr_jars', 6.5, 11.5], ['pr_lantern', 7.3, 9.2],
        ['pr_bookshelf', 22, 10], ['pr_table', 24.5, 11.5], ['pr_pine', 25, 9],
        ['pr_pine', 6, 6.5], ['pr_pine', 20.5, 6.8], ['pr_bamboo', 1.5, 20], ['pr_bamboo', 5, 22.5], ['pr_maple', 8.5, 7.5], ['pr_lotus', 24.5, 19.5, { flat: true }], ['pr_lotus', 26, 18, { flat: true }],
        ['pr_rocks', 23, 22.5], ['pr_boulder', 21.5, 15.5],
      ],
      spots: {
        room: { x: 13, y: 5, w: 2, h: 1, name: '별채 — 글자를 짓는 방', act: '들어가기', mh: 40 },
        sound: { x: 2, y: 9, w: 6, h: 5, name: '소리를 내어 살피는 자리(聲)', act: '소리 내기', mh: 36 },
        books: { x: 22, y: 12, w: 3, h: 1, name: '운서 서가(理)', act: '운서 읽기', mh: 40 },
        people: { x: 18, y: 6, w: 2, h: 1, name: '백성의 말을 받아 적은 자리(民)', act: '읽어 보기', mh: 30 },
        chest: { x: 10.5, y: 6, w: 1, h: 1, name: '함', act: '열어 보기', mh: 16 },
        pond: { x: 24, y: 18, w: 3, h: 2, look: ['후원의 작은 못이다. 연잎 위로 바람이 지나간다.'] },
      },
      npcs: {},
    },

    // ───────── 6장 · 근정전 앞뜰(어전 논변) ─────────
    court: {
      name: '근정전 앞뜰', music: 'court', spawn: [15.5, 21, 'up'], combat: true,
      grid: mk(32, 24, '=', [
        ['rect', 0, 0, 32, 4, '#'],
        ['rect', 14, 3, 4, 1, '='],
        ['rect', 14, 4, 4, 6, 'r'],
        ['rect', 0, 20, 32, 4, '='],
        ['border', '#'],
      ]),
      props: [
        ['pr_gate', 14, 3.2],
        ['pr_banner', 12, 5.5], ['pr_banner', 19, 5.5],
        ['pr_lantern', 6, 8], ['pr_lantern', 24, 8], ['pr_lantern', 6, 16], ['pr_lantern', 24, 16],
        ['pr_jars', 3, 13], ['pr_jars', 27, 15.5], ['pr_bush', 10, 16], ['pr_bush', 21, 11], ['pr_plum', 28, 18], ['pr_pine', 2, 18.8],
        ['pr_pine', 0.5, 23.2], ['pr_pine', 29.5, 23.2],
      ],
      spots: {},
      npcs: {},
    },
  };
})();
