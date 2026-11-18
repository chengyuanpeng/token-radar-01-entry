type Protocol = { slug:string; name:string; category:string|null; chains:string[]; tvl_usd:number; change_7d:number|null; mcap_usd:number|null; listed_at:string|null; gecko_id:string|null; symbol:string|null };
export type Snapshot = { as_of:string; source:string; floor_usd:number; protocols:Protocol[]; watchlist:string[] };
type BoardRow = { slug:string; name:string; rank:number; implied_value_usd:number; farm_steps:string[] };
const excludedCategories = new Set(['Bridge','Canonical Bridge','Liquid Staking','Liquid Restaking','Restaked BTC','CEX']);
const exchange = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;
const excludedName = /\b(wrapped|staked|staking)\b/i;
const version = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const median = (xs:number[]) => { const a=[...xs].sort((x,y)=>x-y), n=a.length; return n ? (n%2 ? a[(n-1)/2] : (a[n/2-1]+a[n/2])/2) : 0; };
function utcDay(s:string):number { const [y,m,d]=s.split('-').map(Number); return Date.UTC(y,m-1,d)/86400000; }
export function parseSnapshot(text:string):Snapshot {
  const x=JSON.parse(text);
  if (!x || typeof x.as_of!=='string' || typeof x.source!=='string' || !Array.isArray(x.protocols) || !Array.isArray(x.watchlist)) throw new Error('Invalid snapshot shape');
  for (const p of x.protocols) if (!p || typeof p.slug!=='string' || typeof p.name!=='string' || !Array.isArray(p.chains) || typeof p.tvl_usd!=='number') throw new Error('Invalid protocol record');
  return x as Snapshot;
}
function isExcluded(p:Protocol):boolean { return (p.category!==null && excludedCategories.has(p.category)) || excludedName.test(p.name) || exchange.test(p.name) || version.test(p.name); }
function isCandidate(p:Protocol):boolean { return p.gecko_id===null && p.symbol===null && !isExcluded(p); }
function chainGas(chain:string):string { if (/^ethereum$/i.test(chain)) return '$8–25'; if (/solana/i.test(chain)) return '$0.05'; if (/arbitrum|base|optimism|scroll|zksync|linea|blast|mantle|mode|polygon zk/i.test(chain)) return '$0.10–1'; return '$0.10–2'; }
function playbook(category:string|null, name:string, chain:string, capital:string):string[] {
 const c=(category??'').toLowerCase();
 let core:string[];
 if (/dex|exchange/.test(c)) core=[`Make small recurring swaps on ${name}, then provide liquidity to a main pair and monitor its pool fees.`,`Rebalance the ${name} LP position weekly and withdraw if liquidity or volume falls sharply.`];
 else if (/lend|borrow|money market/.test(c)) core=[`Supply a liquid asset to ${name} as collateral, keeping a large safety buffer against liquidation.`,`Borrow conservatively, repay in several separate cycles, and track rates and health factor after each action.`];
 else if (/derivative|perp|perpetual/.test(c)) core=[`Generate measured ${name} trading volume with delta-hedged positions and tight exposure limits.`,`Close and reopen small hedged positions across separate sessions, recording fees and funding costs.`];
 else if (/yield|vault/.test(c)) core=[`Deposit a modest amount into a ${name} vault and leave it through one complete strategy epoch.`,`Withdraw after the first epoch, inspect realized yield and fees, then redeposit for a second epoch if risks remain acceptable.`];
 else if (/cdp|stablecoin/.test(c)) core=[`Post liquid collateral to ${name} and mint only a conservative fraction of the available stablecoin capacity.`,`Repay and remint a smaller amount in separate cycles while keeping collateralization comfortably above the liquidation threshold.`];
 else if (/rwa|real world/.test(c)) core=[`Complete ${name} onboarding and eligibility checks, then acquire a small tokenized asset position.`,`Hold through the required period and review issuer, redemption, and custody terms before adding funds.`];
 else if (/launchpad|launch/.test(c)) core=[`Complete ${name} account and eligibility steps before a sale opens, and review sale terms and unlocks.`,`Participate in a small allocation only when the schedule, allocation rules, and claim process are clear.`];
 else if (/risk curators/.test(c)) core=[`On ${chain}, deposit into two or three of ${name}'s curated vaults, spreading funds across different curators or strategies; read each curator's risk disclosures and vault caps before depositing.`,`Each month, record deposits by vault and track APY and TVL share; rebalance if a vault's share or risk profile shifts materially.`];
 else if (/onchain capital allocator/.test(c)) core=[`Allocate a starter tranche to ${name}'s flagship strategy or vault, then ladder further deposits across at least two epochs instead of one lump sum.`,`Read allocation or strategy reports when published and compare reported performance with a simple cash or T-bill benchmark; withdraw to the base asset if the strategy pauses or reports stop.`];
 else if (/basis trading/.test(c)) core=[`Fund ${name}'s basis strategy on ${chain} with a starter tranche; check the funding-rate regime weekly, since the strategy earns when funding is positive.`,`Add only during funding dislocations and never chase a move; write down an exit rule such as two consecutive weeks of negative funding and follow it.`];
 else if (/prediction market/.test(c)) core=[`Trade small size on ${name}'s most liquid markets each week, diversify across event types, and keep total exposure within the suggested tier capital.`,`Track any fee, rebate, or points schedule ${name} publishes and record every trade for later eligibility checks.`];
 else core=[`Use ${name}'s core product once each week and record the transaction, fee, and resulting position.`,`Maintain a modest on-protocol position, then join a governance vote or testnet task when one is officially available.`];
 return [`Set up a wallet and fund it on ${chain} for gas: budget roughly ${chainGas(chain)} per transaction, and keep a small reserve for follow-up transactions.`,...core,`Start with ${capital} working capital for ${name}; cap exposure to an amount you can afford to lose and avoid leverage.`,`Review ${name}'s TVL trend and official channels monthly; if a token or points program is announced, verify eligibility and claim steps there. Budget ~20 minutes for setup and ~10 minutes weekly for 8–12 weeks.`];
}
export function buildRadar(snapshot:Snapshot):{board:BoardRow[]; radar:any} {
 const protocols=snapshot.protocols;
 const live=protocols.filter(p=>p.mcap_usd!==null&&p.mcap_usd>0&&p.tvl_usd>0);
 const liveCategorized=live.filter(p=>p.category!==null);
 const all=median(liveCategorized.map(p=>p.mcap_usd!/p.tvl_usd));
 const byCat=new Map<string,number[]>();
 for(const p of liveCategorized){const c=p.category!; if(!byCat.has(c))byCat.set(c,[]); byCat.get(c)!.push(p.mcap_usd!/p.tvl_usd);}
 const categories=[...byCat.keys()].sort((a,b)=>a<b?-1:a>b?1:0).map(category=>{const xs=byCat.get(category)!, catMedian=median(xs);const used=catMedian>0&&all>0?Math.exp((xs.length*Math.log(catMedian)+6*Math.log(all))/(xs.length+6)):all;return {category,live_peers:xs.length,median_multiple:catMedian,used_multiple:used};});
 const mults=new Map(categories.map(c=>[c.category,c.used_multiple]));
 const candidates=protocols.filter(isCandidate);
 const knownAges=candidates.filter(p=>p.listed_at!==null).map(p=>utcDay(snapshot.as_of)-utcDay(p.listed_at!));
 const ageMedian=median(knownAges);
 const rows=candidates.map(p=>{
  const age=p.listed_at===null?null:utcDay(snapshot.as_of)-utcDay(p.listed_at);
  const ageFor=age===null?ageMedian:age;
  const multiple=p.category===null?all:(mults.get(p.category)??all);
  const base=p.tvl_usd*multiple;
  const g=Math.max(-50,Math.min(100,p.change_7d??0));
  const gf=1+0.5*Math.tanh(g/40);
  const mf=0.75+0.5*(1-Math.exp(-ageFor/540));
  const bf=1+0.04*Math.min(Math.max((p.chains.length||1)-1,0),6);
  const value=Math.max(10000,Math.round(base*gf*mf*bf));
  const chain=p.chains[0]??'Ethereum';
  const capital=p.tvl_usd>=100000000?'$500–2,000':p.tvl_usd>=20000000?'$250–1,000':'$100–500';
  return {slug:p.slug,name:p.name,category:p.category,chains:[...p.chains],tvl_usd:p.tvl_usd,change_7d:p.change_7d,age_days:age,listed_at:p.listed_at,watchlist:snapshot.watchlist.includes(p.slug),implied_value_usd:value,base_usd:Math.round(base),multiple,growth_factor:gf,maturity_factor:mf,breadth_factor:bf,farm_steps:playbook(p.category,p.name,chain,capital)};
 }).sort((a,b)=>b.implied_value_usd-a.implied_value_usd||b.tvl_usd-a.tvl_usd||(a.slug<b.slug?-1:a.slug>b.slug?1:0));
 const rankedRows=rows.map((r,i)=>({slug:r.slug,name:r.name,category:r.category,chains:r.chains,tvl_usd:r.tvl_usd,change_7d:r.change_7d,age_days:r.age_days,listed_at:r.listed_at,watchlist:r.watchlist,rank:i+1,implied_value_usd:r.implied_value_usd,base_usd:r.base_usd,multiple:r.multiple,growth_factor:Number(r.growth_factor.toFixed(4)),maturity_factor:Number(r.maturity_factor.toFixed(4)),breadth_factor:Number(r.breadth_factor.toFixed(4)),farm_steps:r.farm_steps}));
 const board=rankedRows.map(r=>({slug:r.slug,name:r.name,rank:r.rank,implied_value_usd:r.implied_value_usd,farm_steps:r.farm_steps}));
 const radar={meta:{as_of:snapshot.as_of,source:snapshot.source,floor_usd:snapshot.floor_usd,protocol_count:protocols.length,candidate_count:candidates.length,watchlist_count:snapshot.watchlist.length,live_count:live.length,model:{shrinkage_k:6,shrink_mode:'log',growth_weight:0.5,maturity_floor:0.75,maturity_range:0.5,maturity_tau_days:540,breadth_per_chain:0.04,min_value_usd:10000},categories},rows:rankedRows};
 return {board,radar};
}
export function boardIssue(board:BoardRow[],snapshot:Snapshot):string|null {
 if(board.length<100||board.length>4000)return `row count ${board.length} is outside 100-4000`;
 const slugs=new Set(snapshot.protocols.map(p=>p.slug)), seen=new Set<string>();
 for(const s of snapshot.watchlist)if(!board.some(r=>r.slug===s))return `watchlist slug missing: ${s}`;
 let prior=Infinity, previousValue:number|undefined;
 for(let i=0;i<board.length;i++){const r=board[i];if(seen.has(r.slug))return `duplicate slug: ${r.slug}`;seen.add(r.slug);if(!slugs.has(r.slug))return `slug not in snapshot: ${r.slug}`;if(r.rank!==i+1)return `rank at row ${i+1} is ${r.rank}`;if(!Number.isInteger(r.implied_value_usd)||r.implied_value_usd<=0)return `invalid implied value for ${r.slug}`;if(r.implied_value_usd>prior)return `implied values increase at ${r.slug}`;if(previousValue===undefined)previousValue=r.implied_value_usd;prior=r.implied_value_usd;if(!Array.isArray(r.farm_steps)||r.farm_steps.length<3||r.farm_steps.length>12)return `invalid farm step count for ${r.slug}`;for(const step of r.farm_steps)if(typeof step!=='string'||step.trim().length<20||step.trim().length>600)return `invalid farm step for ${r.slug}`;}
 if(board.every(r=>r.implied_value_usd===board[0].implied_value_usd))return 'all implied values are equal';
 return null;
}
export function dataScript(radar:unknown):string{return 'window.RADAR = '+JSON.stringify(radar)+';\n';}
