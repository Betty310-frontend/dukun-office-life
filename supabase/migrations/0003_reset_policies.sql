-- 데이터 초기화 기능("시뮬레이션 진행 기록만" 리셋)에 필요한 정책 추가.
-- daily_events/messenger_logs는 insert만 가능했어서 리셋 시 delete가 막혀 있었다.
create policy "daily_events deletable by authenticated"
  on daily_events for delete to authenticated using (true);
create policy "messenger_logs deletable by authenticated"
  on messenger_logs for delete to authenticated using (true);

-- npcs는 select 정책만 있고 update 정책이 없었다. app/actions/advance-day.ts가 매일
-- npcs.stress를 update하지만 RLS가 막아 조용히 0행 반영되고 있었을 가능성이 높다.
create policy "npcs writable by authenticated"
  on npcs for update to authenticated using (true) with check (true);
