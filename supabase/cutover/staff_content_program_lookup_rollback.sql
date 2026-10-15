-- Roll back only the read-only lookup RPC. No curriculum/contract data is changed.
-- Deploy the previous app version or use fixture mode first.
drop function if exists public.resolve_organization_content_program(uuid);
