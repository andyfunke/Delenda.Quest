import assert from "node:assert/strict";
import test from "node:test";

const {
  APHORISMS,
  aphorismDayKey,
  aphorismForDay,
  millisecondsUntilNextLocalDay,
}=await import(process.env.DELENDA_APHORISM_BUNDLE);

test("daily aphorisms do not repeat until the corpus is exhausted",()=>{
  const seen=[];
  for(let day=1;day<=APHORISMS.length;day++){
    const selected=aphorismForDay("account@example.test",`2026-08-${String(day).padStart(3,"0")}`,seen);
    assert.ok(selected);
    assert.ok(!seen.includes(selected.id),`${selected.id} repeated before the corpus was exhausted`);
    seen.push(selected.id);
  }
  assert.equal(new Set(seen).size,APHORISMS.length);
});

test("the same account and local day retain one assigned aphorism",()=>{
  const seen=["Q001","Q002","Q003"];
  const left=aphorismForDay("account@example.test","2026-07-23",seen);
  const right=aphorismForDay("account@example.test","2026-07-23",seen);
  assert.deepEqual(left,right);
});

test("every module header advances with the account-day assignment",()=>{
  const modules=["campaign","production","military","diplomacy","doctrine"];
  const first=aphorismForDay("account@example.test","2026-07-23",[]);
  assert.ok(first);
  const second=aphorismForDay("account@example.test","2026-07-24",[first.id]);
  assert.ok(second);
  assert.notEqual(second.id,first.id);
  for(const surface of modules){
    const renderedFirst=`${surface}:${first.id}:${first.text}`;
    const renderedSecond=`${surface}:${second.id}:${second.text}`;
    assert.notEqual(renderedSecond,renderedFirst,`${surface} retained the prior account-day quote`);
  }
});

test("local calendar boundaries compile without UTC drift",()=>{
  const before=new Date(2026,6,23,23,59,59,500);
  const after=new Date(2026,6,24,0,0,0,50);
  assert.equal(aphorismDayKey(before),"2026-07-23");
  assert.equal(aphorismDayKey(after),"2026-07-24");
  assert.ok(millisecondsUntilNextLocalDay(before)<=500);
  assert.ok(millisecondsUntilNextLocalDay(after)>86_000_000);
});

test("account-selected time zones own the day boundary, including DST days",()=>{
  const instant=new Date("2026-07-24T06:30:00.000Z");
  assert.equal(aphorismDayKey(instant,"America/Los_Angeles"),"2026-07-23");
  assert.equal(aphorismDayKey(instant,"Europe/Paris"),"2026-07-24");

  const beforeSpringMidnight=new Date("2026-03-09T06:59:59.500Z");
  assert.equal(aphorismDayKey(beforeSpringMidnight,"America/Los_Angeles"),"2026-03-08");
  assert.ok(millisecondsUntilNextLocalDay(beforeSpringMidnight,"America/Los_Angeles")<=500);
});
