-- 1/10/2026: nueva categoría de eventos "Trabajo".
-- Para volver atrás: pasar los eventos de trabajo a otra categoría y restaurar el check sin 'trabajo'.
alter table public.events drop constraint events_category_check;
alter table public.events add constraint events_category_check check (category in ('facu','trabajo','salud','perros','social','casa'));
