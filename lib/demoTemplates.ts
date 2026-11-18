import type { Template } from './templates';

// Dados da demonstração: deliberadamente diferentes das fichas privadas.
const LETTERS = ['A','B','C','D','E'] as const;
export const DEMO_TEMPLATES: Template[] = LETTERS.map((id, index) => ({
  id,
  name: `Ficha ${id}`,
  description: 'Ficha fictícia para experimentar o diário de treinos.',
  days: `Sequência de exemplo ${index + 1}`,
  category: 'Demonstração',
  exercises: Array.from({ length: 3 }, (_, exercise) => {
    const code = `${id.toLowerCase()}${exercise + 1}`;
    return {
      key: code,
      name: code,
      sets: 3,
      target: `${8 + 2 * exercise} repetições`,
      defaultLoad: 10 + 2 * index + 5 * exercise,
      unit: 'kg' as const
    };
  })
}));
