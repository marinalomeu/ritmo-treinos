# Ritmo — Stories de desafios de corrida: modelos oficiais

**Aprovação final:** 20/11/2026. **Status:** os dois modelos visuais estão aprovados como referência oficial. **Implementação e deploy: pendentes para o próximo pacote consolidado.**

> **Importante:** as artes PNG foram aprovadas na conversa, mas seu upload binário ao GitHub ainda não está confirmado. Este documento é a decisão oficial e a especificação de fidelidade; não substitui os PNGs originais. Não afirmar que os arquivos foram publicados no repositório até verificar URLs de arquivos reais.

## Modelo 1 — Primeira conquista de CADA desafio de corrida

**Referência exata:** última versão verde-clara aprovada, sem a escrita `PRIMEIRA CONQUISTA`, sem ramos laterais, preservando a medalha dourada com fita verde, seu relevo de corredor e o texto de distância, a composição, as tipografias, as curvas e margens da arte aprovada no chat.

**Composição fixa:**
- Logo `ritmo.` no alto, com área de segurança do Instagram.
- Medalha dourada com fita verde e a distância daquele desafio.
- Distância em destaque sob a medalha, seguida por `Conquistei no meu ritmo`.
- Barra arredondada de resultado com tempo e data.
- Pílula inferior `1ª vez nesse desafio`.
- **Remover a pílula `Em outro ritmo`** conforme a revisão posterior da usuária; não repetir essa expressão no topo.
- Uma **única paleta verde-clara**; não oferecer temas alternativos.

**Apenas três valores variáveis:** distância/quilômetros do desafio, tempo efetivo e data da conclusão. São valores **obtidos automaticamente dos dados persistidos, não editáveis** no Story. A única escolha é **mostrar ou ocultar o tempo**; quando oculto, **centralizar a data na barra**, sem substituir por outro dado. Não inventar tempos nem conquistas.

**Elegibilidade:** apenas na primeira conclusão válida **daquele ID de desafio pelo usuário**, e não apenas no primeiro desafio da conta. Uma primeira conclusão de 5K e uma primeira conclusão de 10K são conquistas independentes.

## Modelo 2 — Novo recorde pessoal no mesmo desafio, da segunda conclusão em diante

**Referência exata:** última simulação do Story `Em um novo ritmo.` com **fonte principal reduzida**, explicitamente aprovada pela usuária. Não utilizar a versão imediatamente anterior de título muito grande.

**Composição oficial:**
- Logo `ritmo.` no alto; **sem a pílula `Em outro ritmo`**.
- Selo superior `DESAFIO CONCLUÍDO` com troféu, evidenciando que se trata de um desafio do catálogo.
- Manchete central `Em um novo ritmo.` em duas linhas, com a **tipografia reduzida da última referência**, em destaque equilibrado.
- Linha imediatamente abaixo `Novo recorde pessoal neste desafio`.
- Onda suave, distância do desafio em destaque e a barra horizontal de tempo/data, alinhadas à posição correspondente no modelo de primeira conquista.
- Estética verde-clara coerente com a arte final aprovada. **Não adicionar uma medalha de primeira conquista**: ela distingue o Modelo 1.
- Selo de melhor marca **opcional no Story normal**, habilitado somente quando a nova tentativa superou de fato a **melhor performance anterior do mesmo desafio em condições comparáveis**. Uma tentativa pior ou sem comparação válida não habilita esse selo.
- Para corridas, melhoria significa **menor tempo na mesma distância/percurso e nas condições comparáveis definidas pelo produto**. Não inferir recorde do simples término de uma sessão.

**Sobre o Story normal:** a partir da segunda execução, o usuário mantém acesso à família normal de Stories; a expressão/selo de melhor marca representa uma variação **somente se elegível e selecionada**, nunca substitui obrigatoriamente as opções comuns.

## Critérios de QA e governança

1. Comparar prévia e PNG exportado com os dois modelos exatos aprovados, incluindo espaçamento, fontes, margens seguras, paleta, medalha e posicionamento de distância/tempo/data.
2. O story de primeira conquista não inclui título `PRIMEIRA CONQUISTA` nem a pílula `Em outro ritmo`.
3. O Story de novo recorde usa a versão de fonte **menor**, traz `DESAFIO CONCLUÍDO` e explicita `Novo recorde pessoal neste desafio`; sem a pílula `Em outro ritmo`.
4. Cada conclusão é de um desafio específico e pertence ao usuário autenticado; não há concessão de selo para tempo pior, outra distância ou tentativas incompletas.
5. Dados de corrida são reais e preservados; sem edição manual de distância, tempo ou data no modelo de primeira conquista. Ocultação de tempo centraliza somente a data.
6. Não apagar histórico nem realizar migrações ou deploy automático em resposta à aprovação de design.

## Links e referências

- [Backlog oficial: issue #23](https://github.com/marinalomeu/ritmo-treinos/issues/23).
- [Família de 25 Stories normais](README.md).
- Referências visuais aprovadas em chat no dia 20/11/2026: **primeira conquista sem título** e **Em um novo ritmo com fonte reduzida**.

**Pendência operacional:** versionar os **dois PNGs finais** neste diretório por meio de upload GitHub com conteúdo binário verificável. Até isso ser feito, as artes permanecem aprovadas na conversa, mas o repositório guarda apenas as especificações.
