// Source-backed calculation model. All monetary inputs are JPY; rates are fractions.
export const modelVersion='2026.09.14';
export const plans={forche:{name:'forche',specifiedLimit:61000,feeOnTop:473,document:'2026年9月版 P8・P9',verifiedEffectiveDate:null},sbi:{name:'SBIいろどり年金',specifiedLimit:62000,feeOnTop:0,document:'2026年9月版 P8・P9',verifiedEffectiveDate:null}};
export const healthRates=Object.fromEntries('北海道:10.28 青森県:9.85 岩手県:9.51 宮城県:10.10 秋田県:10.01 山形県:9.75 福島県:9.50 茨城県:9.52 栃木県:9.82 群馬県:9.68 埼玉県:9.67 千葉県:9.73 東京都:9.85 神奈川県:9.92 新潟県:9.21 富山県:9.59 石川県:9.70 福井県:9.71 山梨県:9.55 長野県:9.63 岐阜県:9.80 静岡県:9.61 愛知県:9.93 三重県:9.77 滋賀県:9.88 京都府:9.89 大阪府:10.13 兵庫県:10.12 奈良県:9.91 和歌山県:10.06 鳥取県:9.86 島根県:9.94 岡山県:10.05 広島県:9.78 山口県:10.15 徳島県:10.24 香川県:10.02 愛媛県:9.98 高知県:10.05 福岡県:10.11 佐賀県:10.55 長崎県:10.06 熊本県:10.08 大分県:10.08 宮崎県:9.77 鹿児島県:10.13 沖縄県:9.44'.split(' ').map(s=>{const [k,v]=s.split(':');return[k,Number(v)/100]}));
// Lower bounds inclusive. Health grades 1–50 (2026); pension grades are clamped separately.
export const bounds=[0,63000,73000,83000,93000,101000,107000,114000,122000,130000,138000,146000,155000,165000,175000,185000,195000,210000,230000,250000,270000,290000,310000,330000,350000,370000,395000,425000,455000,485000,515000,545000,575000,605000,635000,665000,695000,730000,770000,810000,855000,905000,955000,1005000,1055000,1115000,1175000,1235000,1295000,1355000];
export const standards=[58000,68000,78000,88000,98000,104000,110000,118000,126000,134000,142000,150000,160000,170000,180000,190000,200000,220000,240000,260000,280000,300000,320000,340000,360000,380000,410000,440000,470000,500000,530000,560000,590000,620000,650000,680000,710000,750000,790000,830000,880000,930000,980000,1030000,1090000,1150000,1210000,1270000,1330000,1390000];
export const defaults={type:'ab',matching:10000,plan:'forche',month:'2026-12',salary:300000,commute:10000,company:10000,personal:10000,db:0,age:30,endAge:65,health:'kyouka',prefecture:'東京都',healthEmployeeRate:4.925,careEmployeeRate:0.81,supportEmployeeRate:0.115,employment:'general',bonus1:0,bonus2:0,incomeDeduction:0,residentDeduction:0};
export const contributionTypes={a:'① Aタイプ（会社拠出のみ）',am:'② A＋マッチング',b:'③ Bタイプ（選択制）',ab:'④ A＋Bタイプ'};
// Ignore amounts belonging to another type, including cached values in hidden UI controls.
export function activeContributions(x){return {...x,company:x.type==='b'?0:x.company,personal:['b','ab'].includes(x.type)?x.personal:0,matching:x.type==='am'?x.matching:0};}
export function standardPay(pay){let i=bounds.findLastIndex(n=>pay>=n);return standards[i];}
export function pensionCap(month){return month>='2029-09'?750000:month>='2028-09'?710000:month>='2027-09'?680000:650000;}
export function pensionStandard(pay,month){return Math.max(88000,Math.min(pensionCap(month),standardPay(pay)));}
export function contributionLimits(x){x=activeContributions(x);const legalBase=x.month>='2026-12'?62000:55000;const legal=Math.max(0,legalBase-x.db);const plan=plans[x.plan]?.specifiedLimit;const planAfterDb=Math.max(0,plan-x.db);const fee=plans[x.plan]?.feeOnTop;const legalInvestable=Math.max(0,Math.floor((legal-fee)/1000)*1000);const applicable=Math.floor(Math.min(planAfterDb,legalInvestable)/1000)*1000;return{legalBase,legal,plan,planAfterDb,fee,applicable,personal:x.type==='a'?0:Math.max(0,applicable-x.company)};}
// NTA 2026 annual salary income table, including the 2.191–2.2 million boundary exceptions.
export function salaryIncome(s){if(s<741000)return 0;if(s<2191000)return s-740000;if(s<2193000)return 1451000;if(s<2196000)return 1453000;if(s<2200000)return 1456000;if(s<3600000)return Math.floor(s/4000)*2800-80000;if(s<6600000)return Math.floor(s/4000)*3200-440000;if(s<8500000)return Math.floor(s*.9-1100000);return s-1950000;}
export function basicDeduction(income){return income<=4890000?1040000:income<=6550000?670000:income<=23500000?620000:income<=24000000?480000:income<=24500000?320000:income<=25000000?160000:0;}
export function residentBasic(income){return income<=24000000?430000:income<=24500000?290000:income<=25000000?150000:0;}
export function incomeTax(taxable){const bands=[[0,.05,0],[1950000,.10,97500],[3300000,.20,427500],[6950000,.23,636000],[9000000,.33,1536000],[18000000,.40,2796000],[40000000,.45,4796000]];const[,rate,deduction]=bands.findLast(b=>taxable>=b[0]);return Math.floor(Math.max(0,taxable*rate-deduction)*1.021/100+1e-8)*100;}
// Payroll deduction: fractional yen <= 0.50 is discarded (no special employer agreement).
export const payrollRound=n=>Math.max(0,Math.ceil(n-.5-1e-8));
export function validate(x){x=activeContributions(x);const e=[];if(!Object.hasOwn(contributionTypes,x.type))e.push('拠出タイプを選択してください。');if(!plans[x.plan])e.push('プランを選択してください。');if(!/^2026-(0[4-9]|1[0-2])$/.test(x.month))e.push('対応する適用月は2026年4〜12月です。');
for(const k of ['salary','commute','company','personal','matching','db','age','endAge','bonus1','bonus2','incomeDeduction','residentDeduction'])if(!Number.isSafeInteger(x[k])||x[k]<0)e.push('金額と年齢は0以上の整数で入力してください。');
if(x.age<18||x.age>69||x.endAge<=x.age||x.endAge>70)e.push('年齢は18〜69歳、拠出終了年齢は現在の年齢より上で70歳以下にしてください。');
if(x.salary<=x.personal)e.push('本人拠出後の月給が0円以下です。給与・加入条件を確認してください。');
if(x.type!=='b'&&x.company<3000)e.push('Aを含むタイプの会社拠出は月3,000円以上です。会社拠出なしの場合はBタイプを選んでください。');
if(x.company%1000||x.personal%1000||x.matching%1000)e.push('掛金はパンフレットに合わせて1,000円単位で入力してください。');
if(x.company===0&&x.personal>0&&x.personal<3000)e.push('完全選択制の掛金は月3,000円以上です（なしは0円）。');
if(x.salary>5000000||x.commute>200000||x.bonus1>10000000||x.bonus2>10000000)e.push('この試用版の金額範囲（月給500万円・通勤手当20万円・賞与各1,000万円）を超えています。');
if(!['kyouka','union'].includes(x.health))e.push('健康保険の種類を選択してください。');
if(!Object.hasOwn(healthRates,x.prefecture))e.push('加入支部の都道府県を選択してください。');
if(x.health==='union')for(const k of ['healthEmployeeRate','careEmployeeRate','supportEmployeeRate'])if(!Number.isFinite(x[k])||x[k]<0||x[k]>20)e.push('組合健保の本人負担率を0〜20％で入力してください。');
if(!['general','special','none'].includes(x.employment))e.push('雇用保険の区分を選択してください。');
if(plans[x.plan]){const l=contributionLimits(x);if(x.company>l.applicable)e.push('会社拠出額が適用上限額を超えています。');if(x.personal+x.matching>l.personal)e.push('本人拠出額が本人上限を超えています。');}return [...new Set(e)];}
export function contributions(x,personal){const pay=x.salary-personal;const remuneration=pay+x.commute;const healthStandard=standardPay(remuneration), pension=pensionStandard(remuneration,x.month);
const healthRate=x.health==='union'?x.healthEmployeeRate/100:healthRates[x.prefecture]/2;
const careRate=x.age>=40&&x.age<65?(x.health==='union'?x.careEmployeeRate/100:.0162/2):0;
const supportRate=x.health==='union'?x.supportEmployeeRate/100:.0023/2;
const employmentRate=x.employment==='none'?0:x.employment==='special'?.006:.005;
const monthly={health:payrollRound(healthStandard*healthRate),care:payrollRound(healthStandard*careRate),support:payrollRound(healthStandard*supportRate),pension:payrollRound(pension*.183/2),employment:payrollRound(remuneration*employmentRate)};
monthly.care=payrollRound(healthStandard*(healthRate+careRate))-monthly.health;
const annual=Object.fromEntries(Object.entries(monthly).map(([k,v])=>[k,v*12]));let healthBonusRemaining=5730000;
for(const bonus of [x.bonus1,x.bonus2]){const standard=Math.floor(bonus/1000)*1000;const hb=Math.min(standard,healthBonusRemaining);healthBonusRemaining-=hb;annual.health+=payrollRound(hb*healthRate);annual.care+=payrollRound(hb*(healthRate+careRate))-payrollRound(hb*healthRate);annual.support+=payrollRound(hb*supportRate);annual.pension+=payrollRound(Math.min(standard,1500000)*.183/2);annual.employment+=payrollRound(bonus*employmentRate);}
return{monthly,annual,total:Object.values(annual).reduce((a,b)=>a+b,0),healthStandard,pensionStandard:pension,remuneration,rates:{healthRate,careRate,supportRate,employmentRate}};}
export function scenario(x,personal,matching=0){const matchingDeduction=matching*12;const social=contributions(x,personal);const salary=(x.salary-personal)*12+x.bonus1+x.bonus2;const income=salaryIncome(salary);const basic=basicDeduction(income);const taxable=Math.floor(Math.max(0,income-basic-social.total-x.incomeDeduction-matchingDeduction)/1000)*1000;
// Resident tax: standard 10% income levy BEFORE adjustment/tax credits; not a municipal tax bill.
const residentTaxable=Math.floor(Math.max(0,income-residentBasic(income)-social.total-x.residentDeduction-matchingDeduction)/1000)*1000;
const tax=incomeTax(taxable);const resident=residentTaxable*.1;return{social,salary,income,basic,matchingDeduction,taxable,residentTaxable,incomeTax:tax,residentTax:resident,net:salary+x.commute*12-social.total-tax-resident-matchingDeduction};}
export function simulate(x){x=activeContributions(x);const errors=validate(x);if(errors.length)return{errors};const before=scenario(x,0),after=scenario(x,x.personal,x.matching);const social=before.social.total-after.social.total;const tax=before.incomeTax-after.incomeTax;const resident=before.residentTax-after.residentTax;const savings=social+tax+resident;const months=(x.endAge-x.age)*12;
let pensionLoss=0;const[startY,startM]=x.month.split('-').map(Number);for(let n=0;n<months;n++){const monthIndex=startM-1+n;const date=`${startY+Math.floor(monthIndex/12)}-${String(monthIndex%12+1).padStart(2,'0')}`;pensionLoss+=(pensionStandard(x.salary+x.commute,date)-pensionStandard(x.salary+x.commute-x.personal,date))*.005481;}
return{errors:[],limits:contributionLimits(x),before,after,social,tax,resident,savings,netReduction:(x.personal+x.matching)*12-savings,monthlyContribution:x.company+x.personal+x.matching,annualContribution:(x.company+x.personal+x.matching)*12,capital:(x.company+x.personal+x.matching)*months,companyCapital:x.company*months,personalCapital:(x.personal+x.matching)*months,selectiveCapital:x.personal*months,matchingCapital:x.matching*months,months,pensionAnnualLoss:pensionLoss,pensionMonthlyLoss:pensionLoss/12};}
