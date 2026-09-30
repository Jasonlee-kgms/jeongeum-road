'use strict';
// 맞논변(선생님이 고쳐도 되는 파일) — 게임 설정(虛)
//  - story.js의 논변 단계(enemy: 'doubt' 등)가 맵 위의 맞논변으로 펼쳐진다. 이름·이어 가기 글은 battle.js의 자료를 쓴다.
//  - 상대는 말을 꺼내기 전에 땅에 **붉은 자리**를 먼저 보여 준다. 그 밖으로 비켜서면 된다.
//    slash 넓게 펼치는 주장(부채꼴) · thrust 조목조목 세 번 찌름(곧은 줄) · dash 곧장 밀어붙임(곧은 줄)
//    slam 무겁게 내리누름(둥근 자리) · hex 여기저기서 터지는 말(여러 곳) · summon 함께 올린 이들을 부름
//    charge 큰 논거를 끌어 모음(끊지 못하면 크게 내리누름)
//  - 설득(poise): 답할 때마다 쌓이고 가득 차면 상대의 **말문이 막힌다**(잠시 무방비, 효과 1.5배). 궁리는 설득을 크게 올린다.
//  - hp는 주인공의 답 한 번(능력치에 따라 1~3)을 기준으로 잡았다.
window.BOSSES = {
  // 5장 · 스스로 세워 본 반론(연습)
  doubt: {
    sp: 'sp_phantom_boss', hp: 30, speed: 44, dmg: 2, poise: 9, summon: 'sp_phantom', tutorial: true,
    moves: ['slash', 'dash', 'slash', 'charge', 'summon'],
    tips: {
      slash: '정인지: 붉은 부채꼴은 넓게 펼치는 주장이다. 그 밖으로 비켜서라!',
      dash: '정인지: 곧은 붉은 줄은 곧장 밀어붙이는 말이다. 옆으로 피하라!',
      charge: '정인지: 큰 논거를 끌어 모으고 있다! 몰아쳐 답하거나 **궁리**로 전제를 끊어라. 못 끊으면 크게 내리누른다!',
      summon: '정인지: 잔 의문이 여럿 달려들면 먼저 흩어 놓아라.',
      stagger: '정인지: 말문이 막혔다! 지금이 답할 때다!',
    },
  },

  // 6장 · 집현전 부제학 최만리와의 어전 논변
  choemal: {
    sp: 'sp_courtier_boss', hp: 46, speed: 50, dmg: 3, poise: 12, summon: 'sp_phantom',
    moves: ['thrust', 'slash', 'summon', 'dash', 'charge', 'thrust'],
    tips: {
      thrust: '최만리가 조목을 하나씩 짚는다. 곧은 줄 세 번이니 옆으로 비켜서라.',
      slash: '"큰 나라를 섬기는 처지에…" 넓게 펼치는 주장이다. 부채꼴 밖으로.',
      summon: '함께 상소한 이들이 거든다. 먼저 흩어 놓아라.',
      charge: '가장 무거운 조목을 끌어 모은다! **궁리**로 전제를 끊거나 몰아쳐 답하라.',
      stagger: '최만리가 잠시 말을 잇지 못한다. 지금 답하라!',
    },
  },

  // 7장 · 해례를 엮으며 스스로 넘어야 할 마지막 물음
  last: {
    sp: 'sp_phantom_boss', hp: 76, speed: 52, dmg: 4, poise: 15, summon: 'sp_phantom',
    moves: ['slash', 'dash', 'slam', 'charge', 'thrust'],
    phase2: { at: 0.5, speed: 1.2, quick: 0.85, moves: ['slash', 'hex', 'dash', 'slam', 'summon', 'charge', 'hex'], say: '물음이 사방에서 한꺼번에 터져 나온다. "글자를 만든다고 세상이 바뀌겠는가?"' },
    tips: {
      slam: '무겁게 내리누른다. 둥근 붉은 자리 밖으로 피하라.',
      hex: '여기저기서 말이 터진다. 붉은 자리를 잘 보고 움직여라.',
      charge: '가장 큰 물음을 끌어 모은다! 궁리로 끊거나 몰아쳐 답하라.',
      stagger: '물음이 흔들린다! 지금이 답할 때다!',
    },
  },
};
