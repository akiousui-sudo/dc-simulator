import {defaults,plans,contributionTypes,healthRates} from './engine.mjs';

export const fieldKeys=Object.keys(defaults).filter(key=>key!=='month');
export const initialInputs=Object.fromEntries(fieldKeys.map(key=>[key,String(defaults[key])]));
export const storageKeys={current:'fp-bits.dc-simulator.inputs.v1',preset:'fp-bits.dc-simulator.defaults.v1'};
const choices={plan:Object.keys(plans),type:Object.keys(contributionTypes),health:['kyouka','union'],prefecture:Object.keys(healthRates),employment:['general','special','none']};

// Keep the raw form values, including empty/invalid amounts, separate from the
// calculation's active contributions. Hidden company/personal values must survive.
export function normalizeInputs(values){
 if(!values||typeof values!=='object'||Array.isArray(values))return null;
 const result={...initialInputs};
 for(const key of fieldKeys){
  if(!Object.hasOwn(values,key))continue;
  const value=values[key];
  if(!['string','number'].includes(typeof value))return null;
  const text=String(value);
  if(text.length>100)return null;
  if(choices[key]?!choices[key].includes(text):text!==''&&!Number.isFinite(Number(text)))return null;
  result[key]=text;
 }
 // One personal amount is carried across selective and matching comparisons.
 if(result.type==='am')result.personal=result.matching;
 else result.matching=result.personal;
 return result;
}

export function loadInputs(getStorage,key){
 try{
  const raw=getStorage().getItem(key);
  if(raw===null)return {values:null,status:'missing'};
  const data=JSON.parse(raw);
  const values=data?.version===1?normalizeInputs(data.values):null;
  return {values,status:values?'saved':'invalid'};
 }catch(error){return {values:null,status:error instanceof SyntaxError?'invalid':'unavailable'};}
}

export function saveInputs(getStorage,key,values){
 try{getStorage().setItem(key,JSON.stringify({version:1,values}));return true;}
 catch{return false;}
}
