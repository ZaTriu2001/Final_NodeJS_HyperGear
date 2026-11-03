import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, dateTime } from '../lib/api';
import { useAuth } from '../state/contexts';
import { useResource } from '../lib/useResource';
import Pagination from './Pagination';
import Feedback from './Feedback';
export default function Reviews({ productId, onRating }) {
  const { user } = useAuth(); const [page, setPage] = useState(1); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [connected, setConnected] = useState(false);
  const resource = useResource('/catalog/products/' + productId + '/reviews?page=' + page);
  const reload = resource.reload;
  useEffect(() => { if (resource.data) onRating?.({ productId, rating: resource.data.rating }); }, [resource.data, onRating, productId]);
  useEffect(() => {
    const socket = io({ path: '/socket.io', transports: ['websocket'] });
    socket.on('connect', () => { setConnected(true); socket.emit('join-product', productId); reload(); });
    socket.on('disconnect', () => setConnected(false)); socket.on('reviews:changed', () => reload());
    return () => socket.disconnect();
  }, [productId, reload]);
  async function run(task) { setBusy(true); setMessage(''); try { await task(); reload(); } catch(e) { setMessage(e.message); } finally { setBusy(false); } }
  const submit = e => { e.preventDefault(); const form=e.currentTarget; const body=Object.fromEntries(new FormData(form)); run(async()=>{await api('/catalog/products/'+productId+'/comments',{method:'POST',body});form.reset();}); };
  return <section className="account-card"><h2 className="h3">Bình luận và đánh giá</h2><p>{resource.data?.rating ?? '—'} / 5 · {resource.data?.ratingCount ?? 0} đánh giá thực tế <small className="text-secondary">{connected ? '· Đang cập nhật trực tiếp' : '· Đang kết nối cập nhật trực tiếp'}</small></p>
    {message && <p role="alert" className="alert alert-danger">{message}</p>}
    {user ? <label className="d-block mb-4">Đánh giá của bạn<select aria-label="Đánh giá của bạn" className="form-select w-auto mt-2" disabled={busy} value={resource.data?.myRating ?? 0} onChange={e=>run(()=>api('/catalog/products/'+productId+'/rating',{method:'PUT',body:{stars:Number(e.target.value)}}))}><option value="0" disabled>Chọn số sao</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} sao</option>)}</select></label> : <p>Đăng nhập để đánh giá sao. Bạn vẫn có thể bình luận khi chưa đăng nhập.</p>}
    <form onSubmit={submit} className="mb-4">{!user && <label className="d-block mb-3">Tên hiển thị<input className="form-control" name="author" required minLength={2} maxLength={60}/></label>}<label className="d-block mb-3">Bình luận<textarea className="form-control" name="content" required minLength={2} maxLength={2000} rows={3}/></label><button className="btn btn-hyper" disabled={busy}>Gửi bình luận</button></form>
    <Feedback loading={resource.loading} error={resource.error}>{resource.data?.items.map(c=><CommentEditor key={c.id} comment={c} busy={busy} save={content=>run(()=>api('/catalog/products/'+productId+'/comments/'+c.id,{method:'PATCH',body:{content}}))} remove={()=>run(()=>api('/catalog/products/'+productId+'/comments/'+c.id,{method:'DELETE'}))}/>)}{resource.data?.total===0 && <p>Chưa có bình luận. Hãy chia sẻ câu hỏi hoặc trải nghiệm của bạn.</p>}</Feedback>
    <Pagination page={page} totalPages={resource.data?.totalPages ?? 1} onChange={setPage}/>
  </section>;
}
function CommentEditor({comment:c,busy,save,remove}) {
  const [editing,setEditing]=useState(false); const [content,setContent]=useState(c.content);
  return <article className="border-top py-3"><strong>{c.author}</strong><small className="d-block text-secondary">{dateTime(c.createdAt)}{c.updatedAt!==c.createdAt?' · Đã chỉnh sửa':''}</small>{editing?<form onSubmit={e=>{e.preventDefault();save(content);setEditing(false);}}><textarea aria-label="Sửa bình luận" className="form-control my-2" value={content} onChange={e=>setContent(e.target.value)} required minLength={2} maxLength={2000}/><button disabled={busy} className="btn btn-sm btn-dark">Lưu</button><button type="button" className="btn btn-link btn-sm" onClick={()=>setEditing(false)}>Hủy</button></form>:<p className="pre-wrap my-2">{c.content}</p>}{c.canEdit&&!editing&&<div className="d-flex gap-2"><button className="btn btn-sm btn-outline-dark" onClick={()=>setEditing(true)}>Sửa</button><button disabled={busy} className="btn btn-sm btn-outline-danger" onClick={remove}>Xóa</button></div>}</article>;
}
