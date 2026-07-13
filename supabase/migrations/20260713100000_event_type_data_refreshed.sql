-- Novo tipo de evento: actualização de dados do lead a partir do Google Maps
alter type event_type add value if not exists 'data_refreshed';
