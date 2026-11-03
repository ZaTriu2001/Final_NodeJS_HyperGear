import { useSearchParams } from 'react-router-dom';
import AdminDashboard from '../components/AdminDashboard';
import AdminOrders from '../components/AdminOrders';
import AdminUsers from '../components/AdminUsers';
import AdminProducts, { AdminCategories } from '../components/AdminProducts';
const tabs={dashboard:['Dashboard',AdminDashboard],orders:['Đơn hàng',AdminOrders],products:['Sản phẩm',AdminProducts],categories:['Danh mục',AdminCategories],users:['Khách hàng',AdminUsers]};
export default function AdminPage(){
  const [params,setParams]=useSearchParams();const selected=tabs[params.get('tab')]?params.get('tab'):'dashboard';const View=tabs[selected][1];
  return <div className="page-surface"><div className="container py-4"><h1>HyperGear Admin</h1><nav className="admin-tabs mb-4" aria-label="Quản trị">{Object.entries(tabs).map(([id,[label]])=><button key={id} className={'btn '+(id===selected?'btn-dark':'btn-outline-dark')} aria-current={id===selected?'page':undefined} onClick={()=>setParams({tab:id})}>{label}</button>)}</nav><View key={selected}/></div></div>;
}

