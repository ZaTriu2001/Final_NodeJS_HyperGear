export function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
export function text(value, label, min = 1, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(400, `${label} không hợp lệ.`);
  return value.trim();
}
export function email(value) {
  const result = text(value, 'Email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, 'Email không hợp lệ.');
  return result;
}
export function phone(value) {
  const result = text(value, 'Số điện thoại', 9, 16).replace(/[ .-]/g, '');
  if (!/^(?:0|\+84)\d{9}$/.test(result)) fail(400, 'Số điện thoại cần 10 chữ số, hoặc mã +84.');
  return result;
}
export function password(value, confirmation) {
  if (typeof value !== 'string' || Buffer.byteLength(value) > 72 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/.test(value)) fail(400, 'Mật khẩu cần 8–72 byte, có chữ hoa, chữ thường, số và ký tự đặc biệt.');
  if (value !== confirmation) fail(400, 'Mật khẩu xác nhận không khớp.');
  return value;
}
export function address(value = {}) {
  return { recipient: text(value.recipient, 'Người nhận', 2, 100), phone: phone(value.phone),
    street: text(value.street, 'Số nhà / đường', 3), ward: text(value.ward, 'Phường / xã', 2, 100),
    province: text(value.province, 'Tỉnh / thành phố', 2, 100), note: typeof value.note === 'string' ? value.note.trim().slice(0, 300) : '',
    isDefault: value.isDefault === true };
}
export function integer(value, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(400, `${label} phải là số nguyên từ ${min} đến ${max}.`);
  return value;
}
export function objectId(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) fail(400, 'Mã dữ liệu không hợp lệ.');
  return value;
}
export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
export const shippingFee = province => /^(tp\.?\s*)?(ho chi minh|hcm|thanh pho ho chi minh)$/.test(normalize(province).trim()) ? 30000 : 50000;
