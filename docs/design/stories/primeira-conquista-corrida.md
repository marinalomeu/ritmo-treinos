# Ritmo — Story oficial de primeira conquista: corrida

**Aprovação:** 20/11/2026. **Tipo:** diretriz de identidade visual oficial. **Status técnico:** documentação; ainda não integrado ao gerador nem homologado. Não gerar deploy nesta etapa.

## Referência visual escolhida

A referência oficial é a **imagem aprovada no chat em 20/11/2026**, reapresentada pela usuária como `Imagem do ChatGPT 20 de nov. de 2026, 12_54_39.png`, e a sua revisão **sem as duas folhas/ramos laterais ao título**. A arte tem:

1. Fundo verde-claro suave com curvas discretas e sem alterar a identidade da composição.
2. Logo `ritmo.` centralizado na margem superior segura.
3. Pílula `Em outro ritmo`.
4. Título `PRIMEIRA CONQUISTA` (na versão oficial atual).
5. Medalha dourada com fita verde, corredor e distância da corrida gravados, incluindo os elementos decorativos **internos da medalha**.
6. Distância principal abaixo da medalha e frase `Conquistei no meu ritmo`.
7. Faixa arredondada com `Tempo` e `Data`.
8. Pílula inferior `1ª vez nesse desafio`.

**Não reinvenção:** manter escala, posições, tipografia, fundos e ícones exatamente na referência aprovada; remover exclusivamente as folhagens independentes laterais ao título. Não substituir o original por mockups de composição distinta.

### Variante experimental solicitada

Avaliar uma **segunda versão sem o texto `PRIMEIRA CONQUISTA`**, removendo **apenas** essa inscrição. Todos os outros elementos devem permanecer iguais. Esta variante só se torna oficial mediante aprovação posterior.

## Política única de cor

Este Story especial de primeira conquista dos **desafios de corrida** usa sempre a **mesma paleta verde-clara aprovada**. Não oferecer seletor de temas para ele. Os Stories normais continuam sujeitos às suas próprias cinco paletas oficiais.

## Dados dinâmicos e não editáveis

**Apenas três valores podem variar entre instâncias do modelo**, sempre automaticamente conforme a conclusão real verificada:

- **Distância/quilometragem:** desafio de corrida concluído, por ex. `5K`/`10K`; sincronizar inscrição da medalha e valor central. Origem: ID canônico e prescrição do desafio.
- **Tempo:** resultado do desafio realmente registrado, nunca valor fictício nem duração total do treino se não representa o tempo da prova.
- **Data:** data real da conclusão.

Esses valores **não devem ter campos editáveis no editor de Stories**. Todos os demais elementos são estáticos no layout. A ausência de tempo válido impede apresentar um tempo inventado: estabelecer o tratamento desse estado na implementação/homologação.

## Elegibilidade e testes futuros

- Gerar exclusivamente na **primeira conclusão válida daquele desafio específico** por usuário autenticado, não apenas na primeira conclusão global da conta.
- Repetição do mesmo desafio: Story normal; eventual selo de melhor marca só com melhora comprovada (issue #23).
- Histórico e resultados de outro usuário não devem influenciar elegibilidade ou dados exibidos.
- Validar fidelidade entre prévia e PNG exportado, safe areas de Stories e diferentes comprimentos de distância/data.
- **Nenhuma implementação, migração ou deploy autorizados por este documento.**

Relações: [issue #23](https://github.com/marinalomeu/ritmo-treinos/issues/23), [designs anteriores](README.md).

**Observação de versionamento:** este arquivo registra a aprovação e localiza o anexo visual da conversa. O upload do PNG binário integral ainda precisa ser confirmado por um caminho real no GitHub; não tratar este markdown como substituto do arquivo de imagem.