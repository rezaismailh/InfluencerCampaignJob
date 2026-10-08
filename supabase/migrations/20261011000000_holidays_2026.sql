-- National holidays and joint leave (cuti bersama) 2026, per SKB 3 Menteri
-- No. 1497, 2 and 5 of 2025. Used for the 3-working-day payout deadline.
-- Weekend dates are listed for completeness; they are skipped anyway.
insert into public.holidays (day, name) values
  ('2026-01-01', 'Tahun Baru 2026 Masehi'),
  ('2026-01-16', 'Isra Mikraj Nabi Muhammad SAW'),
  ('2026-02-16', 'Cuti bersama Tahun Baru Imlek 2577 Kongzili'),
  ('2026-02-17', 'Tahun Baru Imlek 2577 Kongzili'),
  ('2026-03-18', 'Cuti bersama Hari Suci Nyepi'),
  ('2026-03-19', 'Hari Suci Nyepi Tahun Baru Saka 1948'),
  ('2026-03-20', 'Cuti bersama Idul Fitri 1447 H'),
  ('2026-03-21', 'Idul Fitri 1447 H'),
  ('2026-03-22', 'Idul Fitri 1447 H'),
  ('2026-03-23', 'Cuti bersama Idul Fitri 1447 H'),
  ('2026-03-24', 'Cuti bersama Idul Fitri 1447 H'),
  ('2026-04-03', 'Wafat Yesus Kristus'),
  ('2026-04-05', 'Kebangkitan Yesus Kristus (Paskah)'),
  ('2026-05-01', 'Hari Buruh Internasional'),
  ('2026-05-14', 'Kenaikan Yesus Kristus'),
  ('2026-05-15', 'Cuti bersama Kenaikan Yesus Kristus'),
  ('2026-05-27', 'Idul Adha 1447 H'),
  ('2026-05-28', 'Cuti bersama Idul Adha 1447 H'),
  ('2026-05-31', 'Hari Raya Waisak 2570 BE'),
  ('2026-06-01', 'Hari Lahir Pancasila'),
  ('2026-06-16', '1 Muharam Tahun Baru Islam 1448 H'),
  ('2026-08-17', 'Proklamasi Kemerdekaan Republik Indonesia'),
  ('2026-08-25', 'Maulid Nabi Muhammad SAW'),
  ('2026-12-24', 'Cuti bersama Kelahiran Yesus Kristus'),
  ('2026-12-25', 'Kelahiran Yesus Kristus')
on conflict (day) do nothing;
