'use strict';
// 장마다 맵 위에서 할 일(선생님이 고쳐도 되는 파일)
//  - 이야기 글은 js/data/story.js에 그대로 있다. 여기서는 "어디서 무엇을 하면 어느 단계가 펼쳐지는지"만 정한다.
//  - beat(목표) 하나 = 화면 위 목표 글 + 할 일 + 펼칠 단계(steps: story.js의 id).
//    할 일: talk:'인물'(말 걸기) · at:'자리'(살피기) · go:'자리'(밟기) · pick:{자리:선택지 번호}(자리를 골라 선택하기)
//           fight:{ waves:[[적…],[적…]] }(의문과 실시간 논변) · train(수련) · auto:true(바로 펼침)
//    그 밖: map·spawn(맵 옮기기) · show/hide(인물 나타내기·숨기기) · night · say(먼저 할 말) · sayPre(그 단계의 앞말을 먼저)
//           boss:{ from:'인물'(그 자리에서 상대가 나섬) | at:[x,y] } · points:1(이기면 기술 점수) · skillTree:true(기술 익히기 화면)
//  - 적: [스프라이트, x, y]  사람: { sp, x, y, dir, who(people.js 인물) 또는 name, talk }
(function () {
  const who = (id, sp, x, y, dir, extra) => Object.assign({ sp, x, y, dir, who: id }, extra);
  const P = (x, y) => ['sp_phantom', x, y];

  window.QUESTS = {
    // ───────── 서장 ─────────
    ch0: {
      map: 'market', avatar: 'sp_listener',
      intro: '화면 왼쪽을 누른 채 끌면 걸어요(PC는 방향키·WASD). 사람 가까이 가면 **말 걸기** 단추가 떠요. 노란 **!** 표시가 다음에 할 일이에요.',
      cast: { market: { narrator: who('narrator', 'sp_narrator', 22, 10.8, 'down') } },
      beats: [
        { id: 'b0-1', goal: '우물가에 앉은 사관에게 가 보자', talk: 'narrator', steps: ['s0-1', 's0-2'] },
        { id: 'b0-2', goal: '대서소에 가서 오늘 온 사람 적는 종이에 이름을 적자', talk: 'scribeman',
          say: [{ who: 'narrator', t: '대서소는 저쪽이오. 글을 대신 써 주는 가게 말이오.' }],
          steps: ['s0-3', 's0-4'] },
      ],
    },

    // ───────── 1장 · 백성의 어려움 ─────────
    ch1: {
      map: 'palace', avatar: 'sp_emperor',
      intro: '이번 장에서는 **임금**이 되어 걸어요. 신하에게 말을 걸고, 대궐 안을 둘러보세요.',
      cast: {
        market: { widow: who('widow', 'sp_joseon_woman', 10.5, 8.4, 'left') },
      },
      beats: [
        { id: 'b1-1', goal: '조회에 나온 형조 관원에게 지난해 옥사를 물어보자', talk: 'c3', steps: ['c1-1'] },
        { id: 'b1-2', goal: '대궐 문 옆 신문고를 살펴보자', at: 'drum', steps: ['c1-2'] },
        { id: 'b1-3', goal: '평복으로 갈아입고 대궐 문을 나서자', go: 'out' },
        { id: 'b1-4', map: 'market', spawn: [11.5, 12, 'up'], music: 'market', goal: '대서소 앞에서 울고 있는 아낙에게 가 보자', talk: 'widow', steps: ['c1-3'] },
      ],
    },

    // ───────── 2장 · 옛 방법의 한계 ─────────
    ch2: {
      map: 'market', spawn: [11.5, 12, 'up'], avatar: 'sp_emperor',
      intro: '세 자리를 **직접 찾아가서** 읽어 보세요. 어느 것을 먼저 보든 괜찮아요.',
      cast: { market: { narrator: who('narrator', 'sp_narrator', 22, 10.8, 'down') } },
      beats: [
        { id: 'b2-1', goal: '이두 · 구결 · 한자 가운데 한 곳에 가서 읽어 보자', pick: { idu: 0, gugyeol: 1, hanja: 2 }, steps: ['c2-1'] },
        { id: 'b2-2', goal: '사관에게 가서 오늘 본 것을 이야기하자', talk: 'narrator', steps: ['c2-2'] },
      ],
    },

    // ───────── 3장 · 소리를 살피다 ─────────
    ch3: {
      map: 'jiphyeon', spawn: [17.5, 15, 'up'],
      intro: '이제부터는 **집현전에 갓 들어온 젊은 학사**가 되어 걸어요.',
      cast: {
        jiphyeon: { king: who('king', 'sp_emperor', 17.5, 8.4, 'down') },
      },
      beats: [
        { id: 'b3-1', goal: '집현전 본채에서 임금을 뵙자', talk: 'king', steps: ['c3-1'],
          then: { show: { bakyeon: who('bakyeon', 'sp_master', 17.5, 12.6, 'down') } } },
        { id: 'b3-2', goal: '마당에 세운 세 패 가운데 한 곳에 가서 소리를 내어 보자 — 입술 · 혀 · 목구멍', pick: { lip: 0, tongue: 1, throat: 2 }, steps: ['c3-2'] },
        { id: 'b3-3', goal: '갈래를 적은 종이를 임금께 올리자', talk: 'king', steps: ['c3-3'] },
      ],
    },

    // ───────── 4장 · 글자를 짓다 ─────────
    ch4: {
      map: 'annex', spawn: [14.5, 20, 'up'], lessonEnd: '1차시',
      intro: '후원 깊숙한 곳의 **별채**예요. 이 일은 아직 아무도 모릅니다.',
      cast: {
        annex: {
          king: who('king', 'sp_emperor', 14.5, 7.4, 'down'),
          sinsuk: who('sinsuk', 'sp_yunseon', 12.5, 9.2, 'down', { talk: [['운서를 다시 뒤져 보았습니다만, 이런 방식은 어디에도 없습니다.']] }),
          seongsam: who('seongsam', 'sp_courtier', 17, 9.2, 'down', { talk: [['밖에서는 아무도 모릅니다. 저도 제가 무슨 일을 하는지 가끔 모르겠고요.']] }),
          bakyeon: who('bakyeon', 'sp_master', 5, 10.4, 'right', { talk: [['소리의 세기는 귀로 가려야 하오. 자꾸 내어 보시오.']] }),
        },
      },
      beats: [
        { id: 'b4-1', goal: '별채에 계신 임금께 가 보자', talk: 'king', steps: ['c4-1'] },
        { id: 'b4-2', goal: '별채 방에 들어가 다섯 글자로 우리말을 적어 보자', at: 'room', steps: ['c4-2'] },
        { id: 'b4-3', goal: '임금께 가서 맡을 갈래를 아뢰자', talk: 'king', steps: ['c4-3'] },
        { id: 'b4-4', goal: '신숙주가 무언가를 묻고 싶어 한다', talk: 'sinsuk', steps: ['c4-4'] },
      ],
    },

    // ───────── 5장 · 글자를 모으다 ─────────
    ch5: {
      map: 'annex', spawn: [14.5, 20, 'up'],
      cast: {
        annex: {
          king: who('king', 'sp_emperor', 14.5, 7.4, 'down'),
          bakyeon: who('bakyeon', 'sp_master', 11, 11.4, 'down'),
          jeongin: who('jeongin', 'sp_rescuer', 19, 11.4, 'down'),
          sinsuk: who('sinsuk', 'sp_yunseon', 23.5, 13.6, 'left', { talk: [['ㆍㅡㅣ 셋으로 열한 자가 나온다니, 몇 번을 세어 봐도 신기합니다.']] }),
        },
      },
      beats: [
        { id: 'b5-1', auto: true, steps: ['c5-1'] },
        { id: 'b5-2', goal: '박연에게 가서 가운뎃소리를 맞춰 보자', talk: 'bakyeon', steps: ['c5-2'] },
        { id: 'b5-3', goal: '임금께 가서 낱자를 모으는 법을 아뢰자', talk: 'king', steps: ['c5-3'] },
        { id: 'b5-4', goal: '수련 — 세 자리 가운데 골라 닦자', train: { step: 'c5-4', at: { sound: 'mu', books: 'byeong', people: 'sul' } } },
        { id: 'b5-4k', say: [{ who: 'jeongin', t: '세 철 동안 닦은 것을 이제 몸에 익히시오. 무엇을 닦았느냐에 따라 쓸 수 있는 **기술**이 다르오.' }], skillTree: true },
        { id: 'b5-5', goal: '임금께서 두고 가신 함을 열어 물건을 고르자', at: 'chest', steps: ['c5-5'] },
        { id: 'b5-6', say: [{ who: 'jeongin', t: '먼저 잔 의문부터 풀어 보시오. 답하기(⚔)로 맞받고, 상대가 **붉게 번쩍이면** 물러서서 피하시오. 民 기술이 있으면 둘러싼 의문을 한꺼번에 밀어낼 수 있소.' }],
          fight: { foes: [P(11, 17), P(18, 17), P(14.5, 20)], text: '몰려든 의문에 답하라', music: 'tension' } },
        { id: 'b5-7', goal: '정인지에게 가서 맞논변을 청하자', talk: 'jeongin', steps: ['c5-6'], boss: { at: [14.5, 16] } },
      ],
    },

    // ───────── 6장 · 반대에 부딪히다 ─────────
    ch6: {
      map: 'palace', spawn: [13.5, 19, 'up'],
      cast: {
        palace: {
          king: who('king', 'sp_emperor', 13.5, 9, 'down'),
          choemal: who('choemal', 'sp_courtier', 16.3, 10.6, 'left'),
        },
        court: {
          king: who('king', 'sp_emperor', 15.5, 5.4, 'down'),
          choemal: who('choemal', 'sp_courtier', 15.5, 10.4, 'down'),
        },
      },
      beats: [
        { id: 'b6-1', goal: '상소를 올린 최만리 앞으로 나아가자', talk: 'choemal', steps: ['c6-1'] },
        { id: 'b6-2', goal: '임금께 가서 무엇부터 답할지 아뢰자', talk: 'king', steps: ['c6-2'] },
        { id: 'b6-3', map: 'court', spawn: [15.5, 21, 'up'], music: 'tension',
          fight: { waves: [[P(10, 14), P(16, 15), P(21, 13), P(13, 18)], [P(6, 12), P(25, 12), P(11, 17), P(20, 18), P(27, 16)]], text: '어전에 쏟아지는 의문에 답하라' }, points: 1 },
        { id: 'b6-4', goal: '최만리와 마주 서자', talk: 'choemal', steps: ['c6-3'], boss: { from: 'choemal' } },
        { id: 'b6-5', auto: true, steps: ['c6-4'], then: { hide: ['choemal'] } },
      ],
    },

    // ───────── 7장 · 펴내다 ─────────
    ch7: {
      map: 'annex', spawn: [14.5, 20, 'up'],
      cast: {
        annex: {
          king: who('king', 'sp_emperor', 14.5, 7.4, 'down'),
          jeongin: who('jeongin', 'sp_rescuer', 19, 11.4, 'down'),
          sinsuk: who('sinsuk', 'sp_yunseon', 23.5, 13.6, 'left', { talk: [['저는 종성해를 맡았습니다. 끝소리는 첫소리를 다시 쓴다는 것, 그 한 줄을 적는 데 사흘이 걸렸습니다.']] }),
          seongsam: who('seongsam', 'sp_courtier', 11, 13.6, 'right', { talk: [['용자례를 맡았습니다. 실제 낱말로 보여 주지 않으면 아무도 믿지 않을 테니까요.']] }),
        },
        market: {
          narrator: who('narrator', 'sp_narrator', 16, 12.8, 'down'),
          widow: who('widow', 'sp_joseon_woman', 10.5, 8.4, 'down'),
        },
      },
      beats: [
        { id: 'b7-1', goal: '정인지에게 가서 해례를 어떻게 나눌지 듣자', talk: 'jeongin', steps: ['c7-1'] },
        { id: 'b7-2', music: 'tension',
          fight: { waves: [[P(10, 16), P(15, 17), P(20, 16), P(12, 20), P(19, 20)], [P(9, 15), P(21, 15), P(13, 19), P(17, 21), P(22, 18), P(8, 18)]], text: '해례를 적으며 떠오르는 물음에 답하라' }, points: 1 },
        { id: 'b7-3', goal: '마지막 물음이 남아 있다', talk: 'jeongin', steps: ['c7-2'], boss: { at: [14.5, 17] } },
        { id: 'b7-4', auto: true, steps: ['c7-3'] },
        { id: 'b7-5', map: 'market', spawn: [11.5, 14, 'up'], music: 'market', goal: '한 해 뒤, 저잣거리에 가 보자', talk: 'widow', steps: ['c7-4'] },
        { id: 'b7-6', goal: '사관에게 가서 마지막 이야기를 남기자', talk: 'narrator', steps: ['c7-5'] },
      ],
    },
  };
})();
