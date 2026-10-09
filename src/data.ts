export type Category = 'Nature'|'Sounds'|'People & Neighborhood'|'Places'|'Food & Making'|'Care'|'Observation';
export type Quest = { title: string; description: string; category: Category; durationMinutes: number };
export type Note = { id:string; expeditionId:string; createdAt:string; duration:number; quest:Quest[]; answers:Record<string,string>; photos:string[]; reflection:string; pattern:string; tomorrowQuest?:Quest; };
export type Capsule = { id:string; title:string; note:string; createdAt:string; context:string; photo?:string; revisits:{date:string;note:string}[] };
export type OutOfPlace = { id:string; title:string; note:string; status:string; createdAt:string; photo?:string };
export type State = { notes:Note[]; capsules:Capsule[]; outOfPlace:OutOfPlace[]; active?:{id:string;startedAt:number;duration:number;quests:Quest[];mode:string}; pendingNote?:{expeditionId:string;duration:number;quests:Quest[]}; tomorrowQuest?:Quest };

export const quests:Quest[] = [
  {title:'A little out of place',description:'Find a plant growing somewhere humans did not plan it.',category:'Nature',durationMinutes:15},
  {title:'A quieter sound',description:'Notice a sound you normally let pass by.',category:'Sounds',durationMinutes:15},
  {title:'The helping hands',description:'Notice someone doing work that helps the neighborhood. Observe respectfully; no photos of people.',category:'People & Neighborhood',durationMinutes:30},
  {title:'Three leaf shapes',description:'Find three different leaf shapes along your way.',category:'Nature',durationMinutes:30},
  {title:'Made by hand',description:'Find something handmade, and wonder who made it.',category:'Food & Making',durationMinutes:15},
  {title:'A quiet repair',description:'Notice something that has been repaired instead of replaced.',category:'Care',durationMinutes:30},
  {title:'The overlooked shop',description:'Notice a local shop you have never really looked at.',category:'Places',durationMinutes:30},
  {title:'Where worlds meet',description:'Find a place where nature and buildings meet.',category:'Observation',durationMinutes:15},
  {title:'Remember the soundscape',description:'Pause and remember three sounds from your walk.',category:'Sounds',durationMinutes:15},
  {title:'Small things working',description:'Find something small that quietly makes the neighborhood work.',category:'Observation',durationMinutes:30},
  {title:'Since last time',description:'Notice something that has changed since your last visit.',category:'Places',durationMinutes:30},
  {title:'Life nearby',description:'Find evidence that something living is nearby.',category:'Nature',durationMinutes:15},
];
export const blindPrompts = [
  'Find a tree taller than the nearest building.','Find three different shades of green.','Notice something alive smaller than your hand.','Follow a sound until you can identify its source.','Find something handmade.','Find something that has been repaired.','Find a place where people naturally gather.','Sit quietly for two minutes.','Find something that seems out of place.'
];
export const fallback = { reflection:'You noticed something worth paying attention to. Tomorrow, choose one familiar route and look for something you have never noticed before.', pattern:'A small detail became a reason to slow down.', tomorrowQuest:{title:'Look Again',description:'Tomorrow, take a familiar route and notice one detail you have never really seen before.',category:'Observation' as Category,durationMinutes:15} };
export const blankState:State = { notes:[], capsules:[], outOfPlace:[] };
export function readState():State { try { return {...blankState,...JSON.parse(localStorage.getItem('observe.v1')||'{}')}; } catch { return blankState; } }
export function writeState(state:State) { localStorage.setItem('observe.v1',JSON.stringify(state)); }
export function todayQuest(day = new Date().getDate()) { return quests[(day-1)%quests.length]; }
export function todayQuests(day = new Date().getDate()) { return [quests[(day-1)%quests.length], quests[day%quests.length], quests[(day+5)%quests.length]]; }
export function uid() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
