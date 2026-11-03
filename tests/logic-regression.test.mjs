import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { startTestStack, client } from './helpers.mjs';
import { Product, Order, Category, Outbox } from '@hypergear/core/models';
import { buildPc, checkCompatibility } from '../services/ai-service/src/builder.js';
import { shippingFee } from '@hypergear/core/validation';
import { calculateEarnedPoints } from '../services/order-service/src/finance.js';
let stack, admin, buyer, guest, account, product, paid, body, headers, build;
const address={recipient:'Logic QA',phone:'0901234567',street:'123 Demo',ward:'Phường Demo',province:'Hồ Chí Minh'};
before(async()=>{
  stack=await startTestStack();await mongoose.connect(stack.uri);admin=client(stack.urls);buyer=client(stack.urls);guest=client(stack.urls);
  await admin('auth','/login','POST',{email:'admin@gmail.com',password:'HyperGear@2026'});
  account=(await buyer('auth','/register','POST',{email:'logic@example.com',fullName:'Logic QA',phone:'0901234567',password:'Testing@2026',confirmPassword:'Testing@2026',shippingAddress:address})).data.user;
  product=(await guest('catalog','/products/amd-ryzen-5-7600')).data;
  await buyer('order','/cart/items','PUT',{productId:product.id,sku:product.variants[0].sku,quantity:1});
  const quote=(await buyer('order','/quote','POST',{addressId:account.addresses[0]._id})).data;
  body={addressId:account.addresses[0]._id,quoteHash:quote.quoteHash,paymentResult:'success'};headers={'Idempotency-Key':randomUUID()};
  paid=(await buyer('order','/','POST',body,headers)).data;
  build=buildPc(await Product.find().lean(),25000000,'gaming');assert(build.available);
});
after(async()=>{await mongoose.disconnect();if(stack)await stack.stop();});
test('L01 delivered order rejects omitted/unknown status without corrupting history',async()=>{
  const row=await Order.create({status:'delivered',statusHistory:[{status:'delivered',at:new Date()}],idempotencyKey:randomUUID()});
  for(const payload of [{},{status:null},{status:'unknown'},{status:'pending'}])assert([400,409].includes((await admin('order','/admin/'+row.id+'/status','PATCH',payload)).status));
  const stored=await Order.findById(row.id);assert.equal(stored.status,'delivered');assert.equal(stored.statusHistory.length,1);
});
test('L02 idempotency key cannot be reused for a different request',async()=>{
  assert.equal((await buyer('order','/','POST',{...body,redeemPoints:1},headers)).status,409);
  assert.equal((await buyer('order','/','POST',body,headers)).data.id,paid.id);
});
test('L03 historical order prices, names and profit are immutable after catalog edits',async()=>{
  const old=await Order.findById(paid.id).lean();
  await Product.updateOne({_id:product.id},{$set:{name:'Renamed after purchase','variants.0.price':1,'variants.0.costPrice':0}});
  const now=await Order.findById(paid.id).lean();assert.deepEqual(now.lines,old.lines);assert.equal(now.profit,old.profit);
  await Product.updateOne({_id:product.id},{$set:{name:product.name,'variants.0.price':product.variants[0].price}});
});
test('L04 negative/fractional loyalty points and missing shipping address are rejected',async()=>{
  for(const redeemPoints of [-1,.5,'1000'])assert.equal((await buyer('order','/quote','POST',{addressId:account.addresses[0]._id,redeemPoints})).status,400);
  assert.equal((await buyer('order','/quote','POST',{})).status,400);
});
test('L05 compatibility fails closed when numeric specifications are missing',()=>{
  for(const [role,key] of [['psu','wattage'],['cpu','power'],['ram','capacityGb'],['mainboard','maxMemoryGb'],['case','maxGpuLengthMm'],['cooler','coolingWatts'],['gpu','lengthMm']]){
    const broken=structuredClone(build.parts);delete broken.find(p=>p.specs.role===role).specs[key];
    assert(checkCompatibility(broken).length>0,'Missing '+role+'.'+key+' must not claim compatibility');
  }
});
test('L06 PC Builder does not pick out-of-stock parts or exceed exact budget',async()=>{
  const products=await Product.find().lean();products.filter(p=>p.specs?.role==='psu').forEach(p=>p.variants.forEach(v=>v.stock=0));
  assert.equal(buildPc(products,25000000).available,false);
  const all=await Product.find().lean();const exact=buildPc(all,build.total);assert(exact.total<=build.total);assert.equal(buildPc(all,1000000).available,false);
});
test('L07 GPU is mandatory when the chosen CPU has no integrated graphics',()=>{
  const broken=structuredClone(build.parts).filter(p=>p.specs.role!=='gpu');broken.find(p=>p.specs.role==='cpu').specs.integratedGraphics=false;assert(checkCompatibility(broken).some(e=>e.includes('GPU')));
});
test('L08 failed category rename rolls back product category changes',async()=>{
  const category=await Category.findOne({name:'CPU'});
  assert.equal((await admin('catalog','/admin/categories/'+category.id,'PATCH',{name:'RAM'})).status,409);
  assert.equal((await Product.findById(product.id)).category,'CPU');assert(await Category.exists({name:'CPU'}));
});
test('L09 two concurrent admin confirmations emit one confirmation event',async()=>{
  const row=await Order.create({status:'pending',statusHistory:[{status:'pending',at:new Date()}],email:'qa@example.com',idempotencyKey:randomUUID()});
  const r=await Promise.all([admin('order','/admin/'+row.id+'/status','PATCH',{status:'confirmed'}),admin('order','/admin/'+row.id+'/status','PATCH',{status:'confirmed'})]);
  assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);assert.equal(await Outbox.countDocuments({type:'order.confirmed','payload.orderId':row.id}),1);
});
test('L10 a comment cannot be modified through a different product route',async()=>{
  const made=await guest('catalog','/products/'+product.id+'/comments','POST',{author:'Logic guest',content:'Bình luận kiểm tra phạm vi.'});
  const other=await Product.findOne({_id:{$ne:product.id},active:true});
  assert.equal((await guest('catalog','/products/'+other.id+'/comments/'+made.data.id,'PATCH',{content:'Sai sản phẩm'})).status,404);
});
test('L11 all four required sort orders are applied by the API',async()=>{
  const collator=new Intl.Collator('vi',{sensitivity:'base'});
  for(const sort of ['name-asc','name-desc','price-asc','price-desc']){
    const r=await guest('catalog','/products?category=CPU&sort='+sort);assert.equal(r.status,200);
    const items=r.data.items.filter(p=>p.variants.some(v=>v.stock>0));
    for(let i=1;i<items.length;i++){
      const a=items[i-1],b=items[i];const cmp=sort.startsWith('name')?collator.compare(a.name,b.name):Math.min(...a.variants.map(v=>v.price))-Math.min(...b.variants.map(v=>v.price));
      assert(sort.endsWith('asc')?cmp<=0:cmp>=0,sort);
    }
  }
});
test('L12 document approved rules that differ from PDF, rather than silently claiming compliance',async()=>{
  const minimal=await guest('auth','/register','POST',{email:'pdf-minimal@example.com',fullName:'PDF Form',shippingAddress:address});
  assert.equal(minimal.status,400); // PDF expects only these fields; current approved form requires password/phone.
  assert.equal((await guest('order','/','POST',body,headers)).status,401); // PDF guest checkout is not implemented.
  assert.equal(calculateEarnedPoints(1000000,false),10000); // Current rules = 1%; PDF example = 100,000 VND.
});
test('L13 shipping fees use current agreed city/province rules',()=>{
  assert.equal(shippingFee('Hồ Chí Minh'),30000);assert.equal(shippingFee('Hà Nội'),50000);
});
