import {flavors,type Locale} from '@last-slice/contracts';

export type PizzaSales = {flavorId:string;quantity:number};

const words=(value:string)=>new Set(value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)||[]);
export function hasPizzaPreference(value:string){const text=words(value);return flavors.some(flavor=>[...words(flavor.name),...flavor.ingredients.flatMap(([,pt,en])=>[...words(pt),...words(en)])].some(word=>text.has(word)))||/(\b(?:suggest|recommend|choose|pick|craving)\b|what should|what do you|sugest|recomend|qual pizza|o que peço|escolh)/i.test(value);}

/** Deterministic nearest-neighbor ranking over catalog ingredient features and current chat text. */
export function recommendWeeklyPizza(sales:PizzaSales[],preferenceText:string,locale:Locale,availableIds?:Set<string>){
 const counts=new Map(sales.map(row=>[row.flavorId,Math.max(0,Math.floor(row.quantity))]));
 const candidates=flavors.filter(flavor=>(!availableIds||availableIds.has(flavor.id))&&(counts.get(flavor.id)||0)>0);
 if(!candidates.length)return undefined;
 const features=(flavor:typeof flavors[number])=>new Set([
  ...words(flavor.name),
  ...flavor.ingredients.flatMap(([,pt,en])=>[...words(pt),...words(en)])
 ]);
 const candidateFeatures=new Map(candidates.map(flavor=>[flavor.id,features(flavor)]));
 const vocabulary=new Set([...popularCandidatesForVocabulary(candidates,counts)].flatMap(flavor=>[...candidateFeatures.get(flavor.id)!]));
 const preference=new Set([...words(preferenceText)].filter(word=>vocabulary.has(word)));
 const hasPreference=preference.size>0;
 const distance=(flavor:typeof flavors[number])=>{
  const f=candidateFeatures.get(flavor.id)!;if(!hasPreference)return 0;
  const intersection=[...preference].filter(word=>f.has(word)).length;
  return 1-intersection/(preference.size+f.size-intersection);
 };
 candidates.sort((a,b)=>(counts.get(b.id)||0)-(counts.get(a.id)||0)||a.id.localeCompare(b.id));
 const popularCandidates=candidates.slice(0,Math.min(3,candidates.length));
 if(hasPreference)popularCandidates.sort((a,b)=>distance(a)-distance(b)||(counts.get(b.id)||0)-(counts.get(a.id)||0)||a.id.localeCompare(b.id));
 const flavor=popularCandidates[0];
 return {flavorId:flavor.id,name:flavor.name,quantity:counts.get(flavor.id)||0,reason:hasPreference?'nearest_preference':'weekly_best_seller',locale};
}

function popularCandidatesForVocabulary(candidates:typeof flavors[number][],counts:Map<string,number>){
 return [...candidates].sort((a,b)=>(counts.get(b.id)||0)-(counts.get(a.id)||0)||a.id.localeCompare(b.id)).slice(0,Math.min(3,candidates.length));
}
