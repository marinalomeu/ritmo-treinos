/** Apenas prescrição numérica inequívoca (ex.: "10", "10 reps", "10 repetições"). */
export function prescribedRepetitions(target:string):number|null{
  const match=target.trim().match(/^(\d{1,5})(?:\s*(?:reps?|repeti(?:ção|ções|cao|coes)))?$/i);
  if(!match)return null;
  const value=Number(match[1]);
  return Number.isInteger(value)&&value>=1&&value<=10000?value:null;
}
