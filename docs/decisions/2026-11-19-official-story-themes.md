# Decisão visual aprovada em 19/11/2026 — card Stories 9:16
**Status: OFICIAL para implementação futura; ainda não implementado nas três variações, não homologado nem publicado em produção.**

## Referência-mestre (não substituir)
Imagem enviada pela proprietária em 19/11: captura do card atual **malva**, composição "FEITO NO / MEU RITMO.", logo `ritmo.` sans-serif no alto, subtítulo `SEU DIÁRIO DE TREINOS`, círculos em linha à direita, kicker `TREINO REGISTRADO`, nome da ficha opcional, métricas concentradas na parte inferior e rodapé `Um treino de cada vez. Uma evolução de cada vez.`

A imagem original enviada pela usuária é a referência visual de fidelidade. Não usar as mockups exploratórias anteriores que modificaram fontes, fundo, hierarquia ou composição.

## As três versões OFICIAIS
1. **Malva**: cor/gradiente da referência atual; visual padrão.
2. **Escuro**: exatamente a **mesma composição, tipografia, espaçamentos, círculos, métricas e elementos**, mudando apenas a paleta para vinho/ameixa escuro.
3. **Claro**: exatamente o mesmo layout, paleta creme/rosé com texto em ameixa escuro.

## Ajustes aceitos para todas as versões
- Logo `ritmo.` e subtítulo visualmente corretos, sem modificações de fonte e sem encobrir pela UI superior do Instagram Stories; validar *safe area* na tela e na exportação.
- Academia/local com marcador discreto de pin e rótulo arredondado **apenas se a usuária ativar explicitamente**; se não houver local ou opção desligada, não aparece e não ocupa espaço.
- Exportação PNG deve reproduzir fielmente a prévia; formato fixo 1080×1920; preservar espaço seguro no topo/rodapé.
- Dados verdadeiros e campos opcionais/privados: data, nome da ficha, tempo, séries concluídas, volume medido, lista de exercícios.
- As três versões são **oficiais como direção de design**. Não promover nenhuma mockup gerada a recurso final sem validação do PNG real.

## Implementação de amanhã
- Atualizar seletor para `Malva / Escuro / Claro` (não apenas Escuro/Claro); manter Malva como padrão.
- Harmonizar CSS prévia e canvas PNG; capturas comparativas para os três temas; testes no Instagram.
- Sem novo deploy automático deliberado e sem merge/produção antes dos gates de segurança multiusuário e autorização específica.