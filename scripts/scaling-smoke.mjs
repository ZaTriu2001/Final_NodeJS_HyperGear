import assert from 'node:assert/strict';
const base=process.env.SMOKE_BASE_URL??'http://localhost:8080';
const answers=await Promise.all(Array.from({length:40},()=>fetch(base+'/api/healthz').then(r=>r.json())));
const instances=[...new Set(answers.map(a=>a.instance))];assert.equal(instances.length,2,'Expected both API gateway instances behind Nginx');
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-HyperGear-Client':'web'},body:JSON.stringify({email:'customer@gmail.com',password:'Customer@2026'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
const sessions=await Promise.all(Array.from({length:20},()=>fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})));
assert(sessions.every(r=>r.status===200));console.log(JSON.stringify({result:'PASS',gatewayRequests:40,instances,sharedSessionRequests:20,allAuthenticated:true}));
