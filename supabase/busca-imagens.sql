-- A busca de imagens dentro do site (Brave) foi retirada: pedia cartão de crédito.
-- Ficou só "Google/Pinterest + colar imagem". A função buscar-imagens agora só faz {acao:'salvar', url}.
-- Limpeza já aplicada no projeto:
drop function if exists public.usar_busca_imagem(uuid, int);
drop table if exists public.busca_imagens_uso;
-- Este arquivo pode ser apagado.
