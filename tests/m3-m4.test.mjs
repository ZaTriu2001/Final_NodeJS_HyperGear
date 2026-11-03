import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';
import { startTestStack, client, freePort } from './helpers.mjs';
import { Product, Order, User, Rating } from '@hypergear/core/models';
import { dateWindow } from '@hypergear/core/reporting';
import { checkCompatibility } from '../services/ai-service/src/builder.js';
let stack, admin, alice, bob, guest, otherGuest, product, user, secondCatalog;
const registration=email=>({email,fullName:'Khách M3',phone:'0901234567',password:'Testing@2026',confirmPassword:'Testing@2026',shippingAddress:{recipient:'Khách M3',phone:'0901234567',street:'123 Đường Demo',ward:'Phường Demo',province:'Hồ Chí Minh'}});
before(async()=>{
  stack=await startTestStack({ELASTICSEARCH_INDEX:'hypergear-test-'+randomUUID()});await mongoose.connect(stack.uri);
  admin=client(stack.urls);alice=client(stack.urls);bob=client(stack.urls);guest=client(stack.urls);otherGuest=client(stack.urls);
  assert.equal((await admin('auth','/login','POST',{email:'admin@gmail.com',password:'HyperGear@2026'})).status,200);
  user=(await alice('auth','/register','POST',registration('m3-alice@example.com'))).data.user;
  await bob('auth','/register','POST',registration('m3-bob@example.com'));
  product=(await guest('catalog','/products?category=CPU')).data.items[0];
});
after(async()=>{if(secondCatalog){secondCatalog.kill('SIGTERM');await once(secondCatalog,'exit');}await mongoose.disconnect();if(stack)await stack.stop();});
test('admin users: RBAC, edit, ban revokes live sessions, cannot promote or edit admin',async()=>{
  assert.equal((await guest('auth','/admin/users')).status,401);assert.equal((await alice('auth','/admin/users')).status,403);
  assert.equal((await admin('auth','/admin/users?q=m3-alice')).data.total,1);
  const edited=await admin('auth','/admin/users/'+user.id,'PATCH',{fullName:'Khách đã cập nhật',role:'admin',status:'blocked'});assert.equal(edited.status,200);assert.equal(edited.data.user.role,'customer');
  assert.equal((await alice('auth','/me')).status,401);
  await admin('auth','/admin/users/'+user.id,'PATCH',{status:'active'});assert.equal((await alice('auth','/login','POST',{email:user.email,password:'Testing@2026'})).status,200);
  const administrator=await User.findOne({role:'admin'});assert.equal((await admin('auth','/admin/users/'+administrator.id,'PATCH',{status:'blocked'})).status,404);
});
test('admin catalog CRUD validates variants/SKUs, hides costs publicly, preserves archived order data',async()=>{
  assert.equal((await alice('catalog','/admin/products')).status,403);
  const body=JSON.parse(JSON.stringify(await Product.findById(product.id).lean()));delete body._id;
  body.slug='m3-test-product';body.name='M3 Test Product';body.variants.forEach((v,i)=>{v.sku='M3-TEST-'+i;});
  assert.equal((await admin('catalog','/admin/products','POST',{...body,variants:body.variants.slice(0,1)})).status,400);
  const created=await admin('catalog','/admin/products','POST',body);assert.equal(created.status,201);
  assert.equal((await admin('catalog','/admin/products','POST',{...body,slug:'other-slug'})).status,409);
  assert.equal((await guest('catalog','/products/'+body.slug)).data.variants[0].costPrice,undefined);
  const changed=await admin('catalog','/admin/products/'+created.data._id,'PUT',{...body,name:'M3 updated',variants:body.variants.map(v=>({...v,stock:8}))});assert.equal(changed.status,200);
  assert.equal((await admin('catalog','/admin/products/'+created.data._id,'DELETE')).status,200);assert.equal((await guest('catalog','/products/'+body.slug)).status,404);
  assert(await Product.findById(created.data._id));
  const category=await admin('catalog','/admin/categories','POST',{name:'Danh mục M3'});assert.equal(category.status,201);
  assert.equal((await admin('catalog','/admin/categories/'+category.data._id,'PATCH',{active:false})).status,200);
});
test('guest comments retain ownership; other guests/users cannot edit; pagination and no owner-token leakage',async()=>{
  const made=await guest('catalog','/products/'+product.id+'/comments','POST',{author:'Khách guest',content:'Cho hỏi CPU này có phù hợp học tập?'});assert.equal(made.status,201);assert.equal(made.data.guestOwnerHash,undefined);
  const path='/products/'+product.id+'/comments/'+made.data.id;
  assert.equal((await otherGuest('catalog',path,'PATCH',{content:'Không phải của tôi'})).status,404);
  assert.equal((await guest('catalog',path,'PATCH',{content:'Tôi muốn hỏi thêm về bộ nhớ RAM.'})).status,200);
  const own=await guest('catalog','/products/'+product.id+'/reviews');assert.equal(own.data.items[0].canEdit,true);assert.equal((await bob('catalog','/products/'+product.id+'/reviews')).data.items[0].canEdit,false);
  assert.equal((await guest('catalog',path,'DELETE')).status,200);assert.equal((await guest('catalog','/products/'+product.id+'/reviews')).data.total,0);
});
test('rating: authentication, one vote per account, update and concurrent average',async()=>{
  const path='/products/'+product.id+'/rating';assert.equal((await guest('catalog',path,'PUT',{stars:5})).status,401);assert.equal((await alice('catalog',path,'PUT',{stars:6})).status,400);
  assert.equal((await alice('catalog',path,'PUT',{stars:5})).status,200);assert.equal((await bob('catalog',path,'PUT',{stars:3})).status,200);
  assert.equal((await guest('catalog','/products/'+product.id+'/reviews')).data.rating,4);
  assert.equal((await alice('catalog',path,'PUT',{stars:1})).status,200);assert.equal(await Rating.countDocuments({productId:product.id}),2);
  assert.equal((await guest('catalog','/products/'+product.id+'/reviews')).data.rating,2);
  const votes=await Promise.all([alice('catalog',path,'PUT',{stars:5}),bob('catalog',path,'PUT',{stars:5})]);assert(votes.every(v=>v.status===200));assert.equal((await guest('catalog','/products/'+product.id+'/reviews')).data.rating,5);
});
test('admin order pagination/detail/filters and dashboard totals match stored snapshots',async()=>{
  const row={userId:user.id,email:user.email,fullName:user.fullName,lines:[{productId:product.id,category:'CPU',productName:product.name,variantName:'Box',sku:product.variants[0].sku,unitPrice:100000,unitCost:60000,quantity:2}],statusHistory:[{status:'pending',at:new Date('2026-01-15')}],revenue:200000,costOfGoods:120000,profit:79000,loyaltyDiscount:1000,amountPaid:199000,shippingFee:30000,totalPaid:229000,paymentStatus:'paid'};
  await Order.insertMany(Array.from({length:21},(_,i)=>({...row,idempotencyKey:randomUUID(),createdAt:new Date('2026-01-15T01:'+String(i).padStart(2,'0')+':00Z')})));
  assert.equal((await admin('order','/admin/list')).data.items.length,20);const second=await admin('order','/admin/list?page=2');assert.equal(second.data.items.length,1);assert.equal(second.data.totalPages,2);
  const detail=await admin('order','/admin/detail/'+second.data.items[0].id);assert.equal(detail.data.profit,79000);assert.equal((await alice('order','/admin/detail/'+detail.data.id)).status,403);
  const metrics=await admin('order','/admin/metrics?start=2026-01-01&end=2026-01-31&unit=quarter');assert.equal(metrics.status,200);assert.equal(metrics.data.orders,21);assert.equal(metrics.data.revenue,4200000);assert.equal(metrics.data.profit,1659000);assert.equal(metrics.data.quantity,42);assert.equal(metrics.data.series.length,1);assert.equal(metrics.data.bestsellers[0].quantity,42);
  assert.equal((await admin('order','/admin/list?start=2026-02-01&end=2026-02-28')).data.total,0);assert.equal((await admin('order','/admin/list?start=2026-02-30&end=2026-03-01')).status,400);
  const w=dateWindow({start:'2026-01-01',end:'2026-01-01'});assert.equal(w.start.toISOString(),'2025-12-31T17:00:00.000Z');assert.equal(w.end.toISOString(),'2026-01-01T17:00:00.000Z');
});
test('PC builder returns a complete compatible in-stock build within budget; impossible budgets honest',async()=>{
  const r=await guest('ai','/pc-builder','POST',{budget:25000000,purpose:'gaming'});assert.equal(r.status,200);assert.equal(r.data.available,true);assert(r.data.total<=25000000);assert.equal(r.data.parts.length,8);assert.deepEqual(checkCompatibility(r.data.parts),[]);assert.equal(r.data.answer.provider,'rules');assert.equal(r.data.parts[0].variant.costPrice,undefined);
  const broken=JSON.parse(JSON.stringify(r.data.parts));broken.find(p=>p.specs.role==='mainboard').specs.socket='INVALID';assert(checkCompatibility(broken).length>0);
  assert.equal((await guest('ai','/pc-builder','POST',{budget:1000000,purpose:'gaming'})).data.available,false);
  assert.equal((await guest('ai','/pc-builder','POST',{budget:25000000,purpose:'unknown'})).status,400);
  const chat=await guest('ai','/chat','POST',{message:'RAM có chức năng gì?'});assert.equal(chat.status,200);assert(chat.data.sources.length>0);assert.equal(chat.data.answer.aiAvailable,false);
});
test('Elasticsearch is used for keyword search and follows catalog changes', {skip:!process.env.ELASTICSEARCH_URL}, async()=>{
  let result;for(let i=0;i<40;i++){result=await guest('catalog','/products?q=man%20hinh');if(result.data.searchProvider==='elasticsearch'&&result.data.total===8)break;await delay(500);}assert.equal(result.data.searchProvider,'elasticsearch');assert.equal(result.data.total,8);assert(result.data.items.every(p=>p.category==='Màn hình'));
});
test('Redis adapter broadcasts review updates between two catalog instances', {skip:!process.env.REDIS_URL}, async()=>{
  const port=await freePort();secondCatalog=spawn(process.execPath,['services/catalog-service/src/index.js'],{env:{...stack.env,PORT:String(port)},stdio:'ignore'});
  let healthy=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:'+port+'/healthz')).ok){healthy=true;break;}}catch{}await delay(100);}assert(healthy);await delay(500);
  const socket=io('http://127.0.0.1:'+port,{transports:['websocket'],reconnection:false});try{await once(socket,'connect');await new Promise((resolve,reject)=>socket.timeout(3000).emit('join-product',product.id,(error,data)=>error?reject(error):resolve(data)));const event=once(socket,'reviews:changed',{signal:AbortSignal.timeout(8000)});await guest('catalog','/products/'+product.id+'/comments','POST',{author:'Realtime guest',content:'Đây là bình luận realtime qua hai instance.'});assert.equal((await event)[0].productId,product.id);}finally{socket.disconnect();}
});
