-- Rode isso uma vez no SQL Editor do Supabase, DEPOIS de `npm run db:push`
-- (que cria a tabela "Usuario" a partir do prisma/schema.prisma).
--
-- Prisma não conhece o schema `auth` do Supabase, então a FK pra auth.users e
-- o trigger que provisiona automaticamente o perfil (email/senha, Google ou
-- qualquer outro provider) ficam aqui, fora do schema.prisma.

alter table "Usuario"
  add constraint "Usuario_id_fkey"
  foreign key (id) references auth.users (id) on delete cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public."Usuario" (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
