'use strict';
// 기술(선생님이 고쳐도 되는 파일) — 게임 설정(虛)
//  - 세 갈래(聲 소리 · 理 이치 · 民 백성) × 세 단계. 기술 점수 1점으로 하나를 익힌다.
//  - 2단계는 그 능력치 3 이상, 3단계는 5 이상이어야 하고, 같은 갈래의 앞 단계를 먼저 익혀야 한다.
//    → 1~5장에서 무엇을 살피고 무엇을 닦았느냐에 따라 익힐 수 있는 기술이 달라진다.
//  - 기술 점수: 5장 수련 한 번에 1점(3점), 6장·7장의 의문 물리치기를 이기면 1점씩.
//  - kind: active(단추로 쓰는 기술, 단추에는 셋까지) · passive(익히면 늘 효과)
//  - 이름은 『훈민정음』 해례본에 나오는 말에서 따왔다. 효과와 수치는 게임 설정이다.
//    내부 이름(mu/byeong/sul)은 원본 프로그램의 것을 그대로 두었다. 화면에는 聲·理·民으로 보인다.
window.SKILLS = {
  trees: [
    { stat: 'mu', han: '聲', name: '소리', ids: ['combo', 'rush', 'whirl'] },
    { stat: 'byeong', han: '理', name: '이치', ids: ['formation', 'ambush', 'stratagem'] },
    { stat: 'sul', han: '民', name: '백성', ids: ['talisman', 'blink', 'storm'] },
  ],
  need: [1, 3, 5], // 단계별 능력치 조건
  list: {
    combo: { name: '청탁 가리기', hanja: '淸濁', kind: 'passive', desc: '맑은 소리와 흐린 소리를 갈라 듣는다. 말을 세 번 이어 붙이면 세 번째가 두 배로 들어가고 상대를 물러서게 한다.' },
    rush: { name: '가획', hanja: '加劃', kind: 'active', cd: 5, icon: '劃', desc: '획을 더하듯 한 걸음 더 나아가며 앞을 막는 의문을 뚫는다. 나아가는 동안은 말려들지 않는다.' },
    whirl: { name: '칠음', hanja: '七音', kind: 'active', cd: 14, icon: '音', desc: '어금니·혀·입술·이·목구멍에서 나는 소리를 한 번에 꿰어, 둘레의 의문을 모두 두 번 흔든다.' },
    formation: { name: '삼재', hanja: '三才', kind: 'passive', desc: '하늘·땅·사람의 이치로 중심을 잡는다. 기력이 4 늘고, 받는 충격이 1 줄어든다.' },
    ambush: { name: '협찬', hanja: '協贊', kind: 'active', cd: 18, icon: '協', desc: '함께 일하는 학사 둘을 불러 10초 동안 곁에서 거들게 한다.' },
    stratagem: { name: '궁리', hanja: '窮理', kind: 'active', cd: 12, icon: '窮', desc: '이치를 끝까지 따져 전제를 무너뜨린다. 모든 의문이 잠시 멈추고, 상대가 큰 주장을 준비하고 있으면 말문이 막혀 한참 흔들린다.' },
    talisman: { name: '훈민', hanja: '訓民', kind: 'active', cd: 6, icon: '訓', desc: '백성이 실제로 겪는 일을 들어 보인다. 둘레의 의문이 한꺼번에 밀려난다.' },
    blink: { name: '유통', hanja: '流通', kind: 'active', cd: 3.5, icon: '流', desc: '뜻이 막힘없이 통하듯, 가려는 쪽으로 순식간에 옮겨 간다. 상대의 주장을 피할 때 좋다.' },
    storm: { name: '편어일용', hanja: '便於日用', kind: 'active', cd: 16, icon: '用', desc: '날마다 쓰기에 편하다는 한마디로 판을 덮는다. 화면 안의 모든 의문이 흔들리고 한동안 느려진다.' },
  },
};
