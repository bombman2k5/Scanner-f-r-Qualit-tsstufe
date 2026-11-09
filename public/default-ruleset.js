const FLD=[['produkt','Produkt','s'],['sdbDatum','SDB-Datum','d'],['giscode','GISCODE','s'],['emicode','EMICODE','e'],['deuz','Blauer Engel (DE-UZ …)','s'],
['voc','VOC g/l','n'],['vocPct','VOC Gew.-%','n'],['wbDecopaint','Wb-Produkt nach Decopaint Anh. II','b'],['vdl01','VdL-RL01-konform','b'],
['powder','Pulverprodukt','b'],['dispLF','Dispersion lösemittelfrei','b'],['plastFree','weichmacherfrei','b'],['aromFree','aromatenfrei (GH10)','b'],
['solventPct','Lösemittelgehalt %','n'],['noLabel','keine kennzeichnungspfl. Stoffe','b'],['filmBiocide','Biozid-Filmkonservierung','b'],
['cpOver','Chlorparaffine ≥ 0,1 %','b'],['haloBlow','halog. Treibmittel ≥ 0,1 %','b'],['tcepOver','TCEP ≥ 0,1 %','b'],['flameHalo','halog. Flammschutzm. ≥ 0,1 %','b'],
['svhcOver','SVHC > 0,1 %','b'],['svhcDatum','Datum SVHC-Erklärung','d'],['emDatum','Datum Emissionsprüfung','d'],['factory','werkseitig beschichtet','b']];

const norm=s=>String(s).toUpperCase().replace(/\s/g,'');
const L8=['D1','ZP1','CP1','CP2','CP3','RU0,5','RU1','RE05','RE10','RE20','RE30','RS10'];
const L9=['D1','ZP1','RE05','RE10','RE20','RE30','RU0,5','RU1'];
const L11=['PU10','PU20','PU40','PU50','RS10','DA20','DSE20','DSA20','DSO20','DH20','DSC20'];
const gc=l=>({k:'giscode',in:l}),vl=v=>({k:'voc',lt:v}),T=(k)=>({k,is:true}),F=(k)=>({k,is:false}),em=(...a)=>({k:'emicode',in:a}),
or=(...c)=>({or:c}),and=(...c)=>({and:c}),man=t=>({man:t}),du=n=>({k:'deuz',has:n});
// ---- Matrix: je Zeile QS1..QS4, Bedingungen müssen alle erfüllt sein ----
const M=[
{n:1,t:'Lacke/Lasuren auf nichtmineralischen Untergründen',q:[[vl(300)],[vl(130)],[vl(100)],[or(du('12A'),and(T('factory'),vl(100)))]]},
{n:2,t:'Innenfarben, Grundierungen auf mineralischen Untergründen',q:[[T('wbDecopaint')],[vl(30)],[or(T('vdl01'),du('102'))],[or(T('vdl01'),du('102'))]]},
{n:3,t:'Grundbeschichtungen mineralisch innen',q:[[vl(30)],[vl(30)],[vl(10)],[vl(5)]]},
{n:4,t:'Tapetenkleber',q:[[or(T('powder'),T('dispLF'))],[or(T('powder'),T('dispLF'))],[or(T('powder'),T('dispLF'))],[or(T('powder'),and(T('dispLF'),T('plastFree'),T('vdl01')))]]},
{n:5,t:'Beschichtungen mineralisch außen / WDVS-Kleber',q:[[vl(40)],[vl(40)],[vl(40)],[vl(40),man('Notwendigkeit filmgeschützter Produkte begründet (UBA-Merkblätter)')]]},
{n:8,t:'Grundierungen, Spachtel, Kleber unter Belägen',q:[[gc(L8)],[gc(L8),or(em('EC1PLUS'),du('113'))],[gc(L8),or(em('EC1PLUS'),du('113'))],[gc(L8),or(em('EC1PLUS'),du('113'))]]},
{n:9,t:'Sperranstriche, Estrichharze, Abdichtungen unter Fliesen',q:[[gc(L9)],[gc(L9)],[gc(L9),em('EC1','EC1PLUS')],[gc(L9),em('EC1','EC1PLUS')]]},
{n:10,t:'Natursteinimprägnierung innen',q:[[T('aromFree')],[T('aromFree')],[T('aromFree')],[{k:'solventPct',lt:5},T('noLabel')]]},
{n:11,t:'Dicht-/Klebstoffe Innenraum (Fugen, Leisten)',q:[[gc(L11)],[gc(L11)],[gc(L11),em('EC1PLUS')],[gc(L11),em('EC1PLUS')]]},
{n:13,t:'Montagekleb-/Dichtstoffe Fassade',q:[[],[],[F('cpOver'),or(em('EC1PLUS'),{k:'vocPct',lt:1})],[F('cpOver'),or(em('EC1PLUS'),{k:'vocPct',lt:1})]]},
{n:31,t:'Filmkonservierte Produkte (Biozide)',q:[[F('filmBiocide')],[F('filmBiocide')],[F('filmBiocide')],[F('filmBiocide')]]},
{n:38,t:'Montageschäume',q:[[em('EC1PLUS'),F('haloBlow'),F('cpOver'),F('tcepOver')],[em('EC1PLUS'),F('haloBlow'),F('cpOver'),F('tcepOver')],[em('EC1PLUS'),F('haloBlow'),F('cpOver'),F('tcepOver'),T('plastFree'),F('flameHalo')],[em('EC1PLUS'),F('haloBlow'),F('cpOver'),F('tcepOver'),T('plastFree'),F('flameHalo')]]},
{n:39,t:'Montageschaum WDVS (nur Fugen, ohne halog. Treibmittel)',q:[[F('haloBlow')],[F('haloBlow')],[F('haloBlow')],[F('haloBlow')]]},
{n:46,t:'PU-Systemkleber',q:[[],[gc(['RU0,5','RU1'])],[gc(['RU0,5','RU1'])],[gc(['RU0,5','RU1'])]]}];

export {norm};
export const DEFAULT={name:'DGNB ENV1.2 V23.3 (Auszug)',fields:FLD.map(([k,l,t])=>({k,l,t})),rows:M,limits:{svhcYears:1,emYears:5}};
