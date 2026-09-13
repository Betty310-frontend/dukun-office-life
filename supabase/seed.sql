insert into npcs (id, name, role, rank, team, work_style, gender, mbti, traits, pref_traits, skill, sales, crisis, stress, active) values
  (1, '김팀장', 'AE', '팀장', '기획1팀', '협업중시형', '남성', 'ENTJ',
    array['리더십', '직설적', '책임감 강함'], array['친화적', '책임감 강함'], 82, 62, 88, 28, true),
  (2, '이대리', '퍼포먼스 마케팅', '대리', '기획2팀', '정확도중시형', '여성', 'ISTJ',
    array['꼼꼼함', '책임감 강함', '독립적'], array['리더십', '눈치 빠름'], 76, 45, 70, 34, true),
  (3, '박과장', '디자인', '과장', '제작팀', '창의탐색형', '여성', 'INFP',
    array['창의적', '공감형', '협업형'], array['친화적', '창의적'], 85, 30, 60, 22, true)
on conflict (id) do nothing;
