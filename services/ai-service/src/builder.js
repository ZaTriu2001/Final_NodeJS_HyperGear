const cheapest = p => p.variants.filter(v => v.stock > 0).sort((a, b) => a.price - b.price)[0];
export function checkCompatibility(parts) {
  const s = role => parts.find(p => p.specs?.role === role)?.specs;
  const cpu = s('cpu'), board = s('mainboard'), ram = s('ram'), psu = s('psu'), box = s('case'), cooler = s('cooler'), storage = s('storage'), gpu = s('gpu');
  const errors = [];
  if (![cpu, board, ram, psu, box, cooler, storage].every(Boolean)) return ['Thiếu linh kiện để tạo một thùng PC hoàn chỉnh.'];
  const required = {
    cpu: { strings: ['socket'], numbers: ['power'] },
    mainboard: { strings: ['socket', 'memoryType', 'formFactor'], numbers: ['maxMemoryGb'], arrays: ['storageInterfaces'] },
    ram: { strings: ['memoryType'], numbers: ['capacityGb'] },
    storage: { strings: ['storageInterface'], numbers: ['capacityGb'] },
    psu: { numbers: ['wattage'] },
    case: { arrays: ['formFactors'], numbers: ['maxGpuLengthMm', 'maxCoolerHeightMm'] },
    cooler: { arrays: ['sockets'], numbers: ['coolingWatts', 'heightMm'] },
    ...(gpu ? { gpu: { numbers: ['power', 'lengthMm'] } } : {}),
  };
  for (const [role, fields] of Object.entries(required)) {
    const spec = s(role);
    if (parts.filter(p => p.specs?.role === role).length !== 1
      || (fields.strings ?? []).some(k => typeof spec[k] !== 'string' || !spec[k].trim())
      || (fields.numbers ?? []).some(k => !Number.isFinite(spec[k]) || spec[k] <= 0)
      || (fields.arrays ?? []).some(k => !Array.isArray(spec[k]) || !spec[k].length || spec[k].some(x => typeof x !== 'string' || !x.trim()))) errors.push('Thiếu hoặc sai thông số bắt buộc: ' + role + '.');
  }
  if (errors.length) return errors;
  if (cpu.socket !== board.socket) errors.push('Socket CPU và mainboard không khớp.');
  if (ram.memoryType !== board.memoryType || ram.capacityGb > board.maxMemoryGb) errors.push('RAM không phù hợp mainboard.');
  if (!board.storageInterfaces?.includes(storage.storageInterface)) errors.push('Mainboard không hỗ trợ giao tiếp ổ cứng.');
  if (!box.formFactors?.includes(board.formFactor)) errors.push('Mainboard không vừa case.');
  if (gpu && gpu.lengthMm > box.maxGpuLengthMm) errors.push('GPU dài hơn giới hạn case.');
  if (!cooler.sockets?.includes(cpu.socket) || cooler.coolingWatts < cpu.power || cooler.heightMm > box.maxCoolerHeightMm) errors.push('Tản nhiệt không phù hợp CPU hoặc case.');
  if (psu.wattage < Math.ceil(((cpu.power ?? 0) + (gpu?.power ?? 0) + 100) * 1.3)) errors.push('Nguồn chưa đủ công suất dự phòng 30%.');
  if (!gpu && !cpu.integratedGraphics) errors.push('CPU không có đồ họa tích hợp; cần GPU.');
  return errors;
}
export function buildPc(products, budget, purpose = 'gaming') {
  const candidates = products.filter(p => p.active !== false && p.specs?.role && cheapest(p));
  const byRole = role => candidates.filter(p => p.specs.role === role);
  const part = p => ({ id: String(p._id ?? p.id), slug: p.slug, name: p.name, category: p.category, specs: p.specs, sold: p.sold ?? 0, variant: cheapest(p), quantity: 1 });
  const results = [];
  for (const cpu of byRole('cpu')) for (const board of byRole('mainboard').filter(p => p.specs.socket === cpu.specs.socket)) {
    const ram = byRole('ram').filter(p => p.specs.memoryType === board.specs.memoryType && p.specs.capacityGb <= board.specs.maxMemoryGb).sort((a,b) => cheapest(a).price-cheapest(b).price)[0];
    const storage = byRole('storage').filter(p => board.specs.storageInterfaces?.includes(p.specs.storageInterface)).sort((a,b)=>cheapest(a).price-cheapest(b).price)[0];
    if (!ram || !storage) continue;
    const gpus = purpose === 'office' ? [null, ...byRole('gpu')] : byRole('gpu');
    for (const gpu of gpus) for (const box of byRole('case')) for (const cooler of byRole('cooler')) {
      const psu = byRole('psu').filter(p => p.specs.wattage >= Math.ceil((cpu.specs.power + (gpu?.specs.power ?? 0) + 100) * 1.3)).sort((a,b)=>cheapest(a).price-cheapest(b).price)[0];
      if (!psu) continue;
      const selected = [cpu, board, ram, storage, gpu, psu, box, cooler].filter(Boolean).map(part);
      if (checkCompatibility(selected).length) continue;
      const total = selected.reduce((sum, p) => sum + p.variant.price, 0); if (total > budget) continue;
      const quality = (cpu.specs.score ?? 50) * (purpose === 'creative' ? 2 : 1) + (gpu?.specs.score ?? 0) * (purpose === 'office' ? .1 : 3);
      const popularity = selected.reduce((sum,p)=>sum+Math.log1p(p.sold),0);
      results.push({ parts: selected, total, score: quality + popularity - total / budget * (purpose === 'office' ? 100 : 1) });
    }
  }
  results.sort((a,b) => b.score-a.score || a.total-b.total);
  if (!results.length) return { available: false, budget, message: 'Chưa có bộ linh kiện đủ tồn kho, tương thích và trong ngân sách. Hãy tăng ngân sách hoặc liên hệ cửa hàng.', parts: [] };
  const best = results[0]; return { available: true, budget, purpose, total: best.total, remaining: budget-best.total, parts: best.parts, compatible: true, checks: ['Socket CPU/mainboard', 'Chuẩn và dung lượng RAM', 'Giao tiếp ổ cứng', 'Kích thước mainboard/GPU/tản nhiệt', 'Nguồn có 30% dự phòng'], warning: 'Thông số tương thích hiện là dữ liệu demo. Cần xác nhận model, BIOS, đầu cắm nguồn và thông số hãng trước khi lắp máy thực tế.' };
}
