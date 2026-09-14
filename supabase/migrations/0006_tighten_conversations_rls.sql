-- conversations의 "for all"(=select/insert/update/delete 전부) 정책은 과했다.
-- 앱 코드는 upsert(insert+update)만 쓰고 delete는 어디서도 하지 않는데, delete가 열려 있으면
-- 인증된 아무나 남의 1:1 대화방을 지울 수 있었고, conversation_messages가 그 방에
-- on delete cascade로 걸려 있어서 안의 메시지까지 통째로 사라질 수 있었다.
drop policy "conversations writable by authenticated" on conversations;

create policy "conversations insertable by authenticated"
  on conversations for insert to authenticated with check (true);
create policy "conversations updatable by authenticated"
  on conversations for update to authenticated using (true) with check (true);
