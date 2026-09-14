-- 프로필별 "오늘의 운세"를 하루 한 번만 AI로 생성해서 캐시해두는 컬럼.
-- 매 페이지 로드마다 새로 생성하면 비용/지연이 커지므로, fortune_date가 오늘(company_state.date)과
-- 같으면 캐시된 fortune_text를 그대로 쓰고, 다르면 다시 생성해서 덮어쓴다.
-- profiles의 기존 "users can update their own profile" 정책(auth.uid() = id)이 이미 커버하므로
-- 별도 RLS 정책은 필요 없다.
alter table profiles
  add column fortune_date date,
  add column fortune_text text;
