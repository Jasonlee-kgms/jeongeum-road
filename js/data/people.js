'use strict';
// 인물(선생님이 고쳐도 되는 파일)
//  - 세종·정인지·신숙주·성삼문·박연·최만리는 실제로 있었던 사람이에요. 다만 게임 속 **대사는 모두 지어낸 것**이고,
//    누가 어떤 말을 했는지까지 기록에 남아 있는 것은 아니에요(임금의 반박 몇 마디만 『세종실록』에 남아 있어요).
//  - 주인공(집현전에 갓 들어온 젊은 학사)은 **실제 인물이 아니라 이 게임이 지어낸 사람**이에요.
window.PEOPLE = {
  narrator: { name: '사관', pt: 'pt_narrator', color: '#1f7474', role: '춘추관에서 실록을 쓰는 사관(게임 속 안내자)' },
  king: { name: '임금', pt: 'pt_emperor', color: '#b8892e', role: '세종. 새 글자를 만들고 펴낸 임금' },
  jeongin: { name: '정인지', pt: 'pt_rescuer', color: '#7a5a1f', role: '집현전의 원로. 해례본의 서문을 썼다' },
  bakyeon: { name: '박연', pt: 'pt_master', color: '#4a6a6a', role: '음악을 맡아 본 신하. 소리의 이치를 가르쳐 준다' },
  sinsuk: { name: '신숙주', pt: 'pt_yunseon', color: '#36548f', role: '함께 일하는 또래 학사. 운서에 밝다' },
  seongsam: { name: '성삼문', pt: '', color: '#8a6a2a', role: '함께 일하는 또래 학사. 발이 넓고 부지런하다' },
  choemal: { name: '최만리', pt: 'pt_father', color: '#b3342a', role: '집현전 부제학. 새 글자 만드는 일을 반대하는 상소를 올린다' },
  scribe: { name: '대서인', pt: 'pt_scribe', color: '#7a6a52', role: '저잣거리에서 삯을 받고 글을 대신 써 주는 사람' },
  widow: { name: '아낙', pt: 'pt_mother', color: '#6d8a5a', role: '억울한 일을 당했으나 소지를 쓸 줄 모르는 백성' },
  doubt: { name: '의심', pt: 'pt_phantom', color: '#6d6a70', role: '스스로 세워 보는 반론. 실제 인물이 아니다(게임 설정)' },
  hero: { name: '{호}', pt: '', color: '#2a2119', role: '주인공. 집현전에 갓 들어온 젊은 학사(게임이 지어낸 인물)' },
};
