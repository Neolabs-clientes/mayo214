# MAYO 214 — web de demostración

Maquetada por NEO Labs. Todo el material (portadas, extractos de 30 s, fotogramas) es del artista.

Regenerar: `python3 /tmp/mayo/gen1.py && python3 /tmp/mayo/gen2.py && python3 /tmp/mayo/gen3.py`

## Portada de espera (27-oct-2026)

`main` publica solo la portada de espera. La web oficial completa esta guardada en la rama `oficial`.
Para restaurarla: `git checkout oficial && git push origin oficial:main --force`.

## Entradas de la gira 2027

Cada fecha de la sección «Gira 2027» lleva su propio botón de compra. Los enlaces los
sirve cada sala; si una sala cambia de ticketera, basta editar el `href` de ese `<li>`
en `index.html` (rama `oficial`) y volver a generar la vista previa.

| Fecha | Ciudad | Sala | Ticketera |
|---|---|---|---|
| 29 ene 2027 | Sevilla | Sala X | fourvenues |
| 19 feb 2027 | Madrid | Sala Kaya (Guadarrama) | salakaya.com |
| 26 feb 2027 | Santander | Sala Kaya | salakaya.com |
| 27 feb 2027 | Bilbao | Sala Fever (Blue) | fourvenues |
| 06 mar 2027 | Málaga | Sala Roka | fourvenues |
| 01 may 2027 | Cáceres | Extremúsika · Mr Bellota | pendiente |
| 08 may 2027 | Madrid | La Sala · Movistar Arena | baila.fm (botón en PRONTO) |
| 20 ago 2027 | Alicante | Guillermo Amor · Ciudad Deportiva | pendiente |

Notas comprobadas el 27-oct-2026:

- Sala Kaya (Guadarrama y Santander): 23:00 h, puertas a las 22:00 h. La web no muestra
  precios: el importe y los tramos los pone la ticketera de cada sala.
- fourvenues bloquea el acceso automático (Cloudflare, 403), así que fecha, ciudad y sala
  se toman de su propia URL de evento; no publican la hora en el slug.
- El enlace de baila.fm para Madrid todavía no está activo: redirige a su portada. El botón
  queda en PRONTO y la URL real está en un comentario del HTML, lista para activarla.
