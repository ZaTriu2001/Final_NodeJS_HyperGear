export async function api(path, options = {}) {
  const response = await fetch('/api' + path, { credentials: 'same-origin', ...options,
    headers: { 'Content-Type': 'application/json', 'X-HyperGear-Client': 'web', ...options.headers },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.message ?? 'Không thể kết nối dịch vụ. Hãy thử lại.'); error.status = response.status; throw error; }
  return data;
}
export const formatVnd = value => new Intl.NumberFormat('vi-VN').format(value ?? 0) + 'đ';
export const dateTime = value => new Date(value).toLocaleString('vi-VN');
