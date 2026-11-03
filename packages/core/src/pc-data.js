// Explicit teaching/demo specifications, not verified manufacturer compatibility data.
export function pcSpecs(product) {
  const slug = product.slug;
  if (product.category === 'CPU') return { role: 'cpu', socket: slug.includes('5600') ? 'AM4' : slug.includes('amd') ? 'AM5' : 'LGA1700', power: slug.includes('i7') ? 220 : slug.includes('14600') ? 190 : 90, score: slug.includes('i7') ? 95 : slug.includes('7800') ? 94 : slug.includes('7900') ? 90 : slug.includes('14600') ? 85 : 65, integratedGraphics: !slug.includes('5600'), demo: true };
  if (product.category === 'GPU') return { role: 'gpu', power: slug.includes('4080') ? 320 : slug.includes('4070') ? 220 : slug.includes('7800') ? 270 : 130, lengthMm: slug.includes('4080') ? 340 : 300, score: slug.includes('4080') ? 100 : slug.includes('4070') ? 80 : slug.includes('7800') ? 75 : 55, demo: true };
  if (product.category === 'RAM') return { role: 'ram', memoryType: 'DDR5', capacityGb: 32, demo: true };
  if (product.category === 'Ổ cứng' && !slug.includes('barracuda')) return { role: 'storage', storageInterface: 'M2', capacityGb: 1000, demo: true };
  return null;
}
const rows = [
  ['demo-board-am5', 'HyperGear Board AM5 DDR5 (Demo)', 'Mainboard', 2400000, { role: 'mainboard', socket: 'AM5', memoryType: 'DDR5', formFactor: 'mATX', storageInterfaces: ['M2'], maxMemoryGb: 128 }],
  ['demo-board-lga1700', 'HyperGear Board LGA1700 DDR5 (Demo)', 'Mainboard', 2600000, { role: 'mainboard', socket: 'LGA1700', memoryType: 'DDR5', formFactor: 'ATX', storageInterfaces: ['M2'], maxMemoryGb: 128 }],
  ['demo-psu-650', 'HyperGear PSU 650W (Demo)', 'Nguồn', 1200000, { role: 'psu', wattage: 650 }],
  ['demo-psu-850', 'HyperGear PSU 850W (Demo)', 'Nguồn', 1900000, { role: 'psu', wattage: 850 }],
  ['demo-case-compact', 'HyperGear Compact Case (Demo)', 'Case', 900000, { role: 'case', formFactors: ['mATX'], maxGpuLengthMm: 320, maxCoolerHeightMm: 160 }],
  ['demo-case-airflow', 'HyperGear Airflow Case (Demo)', 'Case', 1300000, { role: 'case', formFactors: ['ATX', 'mATX'], maxGpuLengthMm: 380, maxCoolerHeightMm: 180 }],
  ['demo-cooler-150', 'HyperGear Tower Cooler 150W (Demo)', 'Tản nhiệt', 500000, { role: 'cooler', sockets: ['AM5', 'LGA1700'], coolingWatts: 150, heightMm: 155 }],
  ['demo-cooler-250', 'HyperGear Tower Cooler 250W (Demo)', 'Tản nhiệt', 1000000, { role: 'cooler', sockets: ['AM5', 'LGA1700'], coolingWatts: 250, heightMm: 170 }],
];
export const pcProducts = rows.map(([slug, name, category, price, specs], i) => ({ slug, name, brand: 'HyperGear Demo', category, shortDescription: 'Linh kiện minh họa cho bài tập kiểm tra tương thích PC; cần xác minh thông số trước mua thực tế.', description: [name, 'Dữ liệu tổng hợp phục vụ bài tập, không phải thông số được hãng xác nhận.', 'Sử dụng cùng rule engine để kiểm tra socket, nguồn và không gian lắp đặt.', 'Mỗi phiên bản có giá, tồn kho và mã SKU riêng.', 'Vui lòng đối chiếu thông số thực tế trước khi mua hoặc lắp máy.'], images: ['/products/accessory.svg', '/products/detail-performance.svg', '/products/detail-warranty.svg'], image: '/products/accessory.svg', variants: [1, 2].map(n => ({ sku: 'HG-PC-' + i + '-' + n, name: n === 1 ? 'Tiêu chuẩn' : 'Gói bảo hành mở rộng', price: price + (n - 1) * 100000, costPrice: Math.round(price * .75), image: '/products/accessory.svg', stock: 20 })), specs: { ...specs, demo: true }, sold: 0, rating: 0 }));
