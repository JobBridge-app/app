-- The legacy helper is service-only while retained for export compatibility.
-- Pin its lookup path so it cannot resolve attacker-controlled objects.

ALTER FUNCTION public.can_act_as(text)
  SET search_path = pg_catalog, public, pg_temp;
