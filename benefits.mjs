// MHLW benefit limits effective 2026-08-01. Scenario examples, not eligibility determinations.
export const benefitRules={effectiveFrom:'2026-08-01',wageMin:3203,childWageMax:16540,careWageMax:18220};
export const benefitSources=[
 ['協会けんぽ：出産手当金','https://www.kyoukaikenpo.or.jp/benefit/childbirth/001/index.html'],
 ['協会けんぽ：傷病手当金・日額の端数処理','https://www.kyoukaikenpo.or.jp/benefit/injury_and_sickness_allowance/'],
 ['厚生労働省：育児休業等給付の要件・支給率','https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000158500.html'],
 ['厚生労働省：介護休業給付の要件・支給率','https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000158665.html'],
 ['厚生労働省：2026年8月改定の給付上限・下限','https://www.mhlw.go.jp/content/001728499.pdf'],
 ['厚生労働省：2026年8月改定の基本手当日額の計算式','https://www.mhlw.go.jp/content/001726936.pdf'],
 ['厚生労働省：労災保険の給付基礎日額','https://www.mhlw.go.jp/content/11200000/001593398.pdf']
];
export const healthBenefitDaily=standard=>Math.round(Math.round(standard/30/10)*10*2/3);
export const leaveWageDaily=(monthly,max)=>Math.min(max,Math.max(benefitRules.wageMin,Math.floor(monthly/30)));
export const leavePayment=(daily,days,percent)=>Math.floor(daily*days*percent/100);
export function unemploymentDaily(monthly,age){
 if(age>=65)return null; // High-age jobseeker benefits require a different eligibility/day model.
 const w=Math.max(benefitRules.wageMin,Math.floor(monthly/30));
 let y;
 if(w<5480)y=w*.8;
 else if(age<60)y=w<=13490?w*.8-.3*(w-5480)/(13490-5480)*w:w*.5;
 else y=w<=12120?Math.min(w*.8-.35*(w-5480)/(12120-5480)*w,w*.05+12120*.4):w*.45;
 const max=age<30?7450:age<45?8270:age<60?9110:7830;
 return Math.min(max,Math.floor(y+1e-9));
}
export function benefitImpacts(x,before,after){
 const h0=healthBenefitDaily(before.social.healthStandard),h1=healthBenefitDaily(after.social.healthStandard);
 const w0=before.social.remuneration,w1=after.social.remuneration;
 const c0=leaveWageDaily(w0,benefitRules.childWageMax),c1=leaveWageDaily(w1,benefitRules.childWageMax);
 const n0=leaveWageDaily(w0,benefitRules.careWageMax),n1=leaveWageDaily(w1,benefitRules.careWageMax);
 const insured=x.employment!=='none';
 const row=(id,title,period,b,a,note,daily,unavailable=null)=>({id,title,period,before:unavailable?null:b,after:unavailable?null:a,loss:unavailable?null:b-a,note,daily:unavailable?[]:daily,unavailable});
 const notInsured=insured?null:'雇用保険「対象外」のため試算対象外です。';
 const daily=(b,a,percent)=>({label:'1日換算の減額目安',loss:(b-a)*percent/100});
 const u0=unemploymentDaily(w0,x.age),u1=unemploymentDaily(w1,x.age);
 return [
  row('maternity','出産手当金','98日分',h0*98,h1*98,'出産する被保険者が無給で休む例（産前42日＋産後56日）。多胎・予定日からのずれ・給与支給による調整は含みません。',[{label:'1日あたりの減額',loss:h0-h1}]),
  row('sickness','傷病手当金','支給対象30日分',h0*30,h1*30,'業務外の病気・けがで働けず、無給で休む例。連続3日間の待期後の支給対象日を30日とします。',[{label:'1日あたりの減額',loss:h0-h1}]),
  row('childcare','育児休業給付金','支給日数300日分',6*leavePayment(c0,30,67)+4*leavePayment(c0,30,50),6*leavePayment(c1,30,67)+4*leavePayment(c1,30,50),'最初の180日は67％、続く120日は50％。無給の30日単位を10回とする例です。出生時育児休業給付の日数を含めて180日を数えます。',[{label:'180日まで・1日換算',loss:(c0-c1)*.67},{label:'181日以降・1日換算',loss:(c0-c1)*.5}],notInsured),
  row('birthSupport','出生後休業支援給付金','28日分',leavePayment(c0,28,13),leavePayment(c1,28,13),'本人・配偶者の休業取得などの受給要件を満たす場合に、最大28日、13％を上乗せ。ここでは上乗せ分だけを表示します。',[daily(c0,c1,13)],notInsured),
  row('care','介護休業給付金','93日換算（参考）',leavePayment(n0,93,67),leavePayment(n1,93,67),'無給で対象家族を介護する場合の67％を、Excelと同じ93日で換算。実際の支給日数は支給単位期間ごとに決まり、暦の休業93日と一致しない場合があります。',[daily(n0,n1,67)],notInsured),
  row('unemployment','失業給付（基本手当）','150日分の例',u0===null?null:u0*150,u1===null?null:u1*150,`入力年齢（${x.age}歳）を離職時年齢とした例。実際の日数は離職理由・被保険者期間等によります。就職する意思と能力などの要件があります。`,[{label:'1日あたりの減額',loss:u0===null?null:u0-u1}],notInsured||(x.age>=65?'65歳以上の離職は高年齢求職者給付金となるため、この150日分の試算対象外です。':null))
 ];
}
