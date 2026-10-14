import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learningProgram, contractWeekAccess, organizationLoginDestination, learningOperations } from '../src/lib/learning/program-entry.ts';
import { queryOrganizationEntitlements } from '../src/lib/entitlement/queries.ts';
import { fetchWeekSessions, nextActionFor } from '../src/lib/weeks/week-session-queries.ts';
const ORG='11111111-1111-1111-1111-111111111111';
const LESSON='22222222-2222-2222-2222-222222222222';
const CLASS='33333333-3333-3333-3333-333333333333';
const active=(weekTo=8,serviceMode='active')=>({ok:true,entitlements:{serviceMode,weekFrom:1,weekTo}});
test('수업 입구는 교사·원장 모두 프로그램 선택으로 보낸다',()=>{
 for(const role of ['teacher','director']) assert.equal(organizationLoginDestination('learning',[role],true),'/learning');
});
test('입구 선택으로 소속 없는 계정에 권한을 만들지 않는다',()=>assert.equal(organizationLoginDestination('learning',[]),null));
test('일반 기관 로그인은 기존 역할별 목적지를 유지한다',()=>{
 assert.equal(organizationLoginDestination(undefined,['teacher']),'/teacher');
 assert.equal(organizationLoginDestination(undefined,['director']),'/director/sessions');
 assert.equal(organizationLoginDestination(undefined,['director'],true),'/director');
});
test('외부 URL·임의 경로·중복 query는 로그인 목적지로 쓰지 않는다',()=>{
 for(const entry of ['https://example.test','//example.test','/admin',['learning'],'learning/../admin']) assert.equal(organizationLoginDestination(entry,['teacher']),'/teacher');
});
test('세 과정은 8·16·24주 누적 범위다',()=>{
 assert.deepEqual(['starter','standard','premium'].map(slug=>learningProgram(slug).durationWeeks),[8,16,24]);
 assert.equal(learningProgram('unknown'),null);
});
test('8주 계약은 1~8주만 열고 9·16·24주는 차단한다',()=>{
 for(let week=1;week<=8;week++) assert.equal(contractWeekAccess(active(),week).allowed,true);
 for(const week of [9,16,24]) assert.equal(contractWeekAccess(active(),week).allowed,false);
});
test('16·24주 계약의 끝 경계가 정확하다',()=>{
 assert.equal(contractWeekAccess(active(16),16).allowed,true);
 assert.equal(contractWeekAccess(active(16),17).allowed,false);
 assert.equal(contractWeekAccess(active(24),24).allowed,true);
 assert.equal(contractWeekAccess(active(24),25).allowed,false);
});
test('이용권 조회 실패와 계약 없음을 구분한다',async()=>{
 const failed=await queryOrganizationEntitlements({rpc:async()=>({error:{code:'PGRST202'},data:null})},ORG);
 assert.equal(failed.ok,false);
 assert.match(contractWeekAccess(failed,1).detail,/확인하지 못했습니다/);
 assert.match(contractWeekAccess(active(8,'no_contract'),1).detail,/유효한.*없습니다/);
});
test('알 수 없는 권한 응답은 허용하지 않는다',async()=>{
 for(const data of [null,{},[],{service_mode:'made_up'}]) assert.equal((await queryOrganizationEntitlements({rpc:async()=>({error:null,data})},ORG)).ok,false);
});
test('미시작·중지·범위 누락·잘못된 주차는 차단한다',()=>{
 for(const mode of ['before_start','org_suspended','no_contract']) assert.equal(contractWeekAccess(active(8,mode),1).allowed,false);
 for(const week of [0,1.5,NaN,Infinity]) assert.equal(contractWeekAccess(active(),week).allowed,false);
 for(const patch of [{weekFrom:null},{weekTo:null},{weekFrom:9,weekTo:8},{weekTo:100},{weekTo:8.5}]) assert.equal(contractWeekAccess({ok:true,entitlements:{...active().entitlements,...patch}},1).allowed,false);
});
test('읽기 전용 계약은 열람 상태로만 표시한다',()=>{
 const access=contractWeekAccess(active(8,'read_only'),1);assert.equal(access.allowed,true);assert.equal(access.label,'기록 열람');
});
test('교사·원장 업무 링크는 각각 실제 역할 경로를 쓴다',()=>{
 assert.match(learningOperations('teacher',ORG).href,/^\/teacher\?/);
 assert.match(learningOperations('director',ORG).href,/^\/director\/sessions\?/);
 assert.equal(nextActionFor('completed','director').href('session','org=test'),'/director/sessions/session/observations?org=test');
 assert.equal(nextActionFor('scheduled','teacher').href('session','org=test'),'/teacher/sessions/session/before?org=test');
});
function stub({lessons=[{id:LESSON}],sessions=[],lessonError=null,sessionError=null}={}){
 const calls=[];
 const client={from(table){calls.push(['from',table]);const chain={};
  for(const method of ['select','eq','in','order']) chain[method]=(...args)=>{calls.push([table,method,...args]);return chain;};
  chain.limit=async()=>({data:table==='curriculum_lessons'?lessons:table==='class_sessions'?sessions:[{id:CLASS,name:'합성 반'}],error:table==='curriculum_lessons'?lessonError:table==='class_sessions'?sessionError:null});return chain;
 }};return {client,calls};
}
test('회차 조회는 차시를 거치고 없는 class_sessions.week_no를 읽지 않는다',async()=>{
 const {client,calls}=stub({sessions:[{id:'session',class_id:CLASS,scheduled_date:'2026-10-14',status:'scheduled'}]});
 const result=await fetchWeekSessions(client,ORG,1);assert.equal(result.ok,true);assert.equal(result.sessions[0].className,'합성 반');
 assert.ok(calls.some(c=>c[0]==='curriculum_lessons'&&c[1]==='eq'&&c[2]==='week_no'));
 assert.ok(calls.some(c=>c[0]==='class_sessions'&&c[1]==='in'&&c[2]==='lesson_id'&&c[3][0]===LESSON));
 assert.ok(!calls.some(c=>c[0]==='class_sessions'&&c[1]==='eq'&&c[2]==='week_no'));
});
test('정확한 차시 ID가 있으면 같은 주차의 다른 교안을 조회하지 않는다',async()=>{
 const {client,calls}=stub();assert.equal((await fetchWeekSessions(client,ORG,1,LESSON)).ok,true);
 assert.ok(!calls.some(c=>c[0]==='from'&&c[1]==='curriculum_lessons'));
});
test('차시 없음과 조회 오류를 구분한다',async()=>{
 assert.deepEqual(await fetchWeekSessions(stub({lessons:[]}).client,ORG,1),{ok:true,sessions:[]});
 assert.deepEqual(await fetchWeekSessions(stub({lessonError:{code:'42703'}}).client,ORG,1),{ok:false,sessions:[]});
});
test('회차 오류·잘못된 차시 ID를 성공으로 보고하지 않는다',async()=>{
 assert.equal((await fetchWeekSessions(stub({sessionError:{code:'42501'}}).client,ORG,1)).ok,false);
 const invalid=stub();assert.equal((await fetchWeekSessions(invalid.client,ORG,1,'not-a-uuid')).ok,false);assert.equal(invalid.calls.length,0);
});
