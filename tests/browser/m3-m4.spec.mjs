import {test,expect} from '@playwright/test';
test('guest comments appear in another browser without reload',async({page,browser},testInfo)=>{
  await page.goto('/san-pham?category=CPU');await page.locator('.product-name').first().click();await expect(page.getByRole('heading',{name:'Bình luận và đánh giá'})).toBeVisible();
  const other=await browser.newContext({baseURL:testInfo.project.use.baseURL??'http://localhost:8080'});const reader=await other.newPage();
  try{await reader.goto(page.url());await expect(reader.getByText('· Đang cập nhật trực tiếp',{exact:false})).toBeVisible();
    const content='Realtime '+Date.now()+' '+testInfo.project.name;await page.getByLabel('Tên hiển thị',{exact:true}).fill('Khách E2E');await page.getByLabel('Bình luận',{exact:true}).fill(content);await page.getByRole('button',{name:'Gửi bình luận'}).click();await expect(reader.getByText(content,{exact:true})).toBeVisible();
    await page.screenshot({path:testInfo.outputPath('realtime-review.png'),fullPage:true});
  }finally{await other.close();}
});
test('admin dashboard, filters and order details work on the real stack',async({page},testInfo)=>{
  await page.goto('/dang-nhap');await page.getByLabel('Email',{exact:true}).fill('admin@gmail.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('HyperGear@2026');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/tai-khoan/);
  await page.getByRole('link',{name:'Quản trị đơn',exact:true}).click();await expect(page.getByRole('heading',{name:'Hiệu quả cửa hàng'})).toBeVisible();await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByLabel('Nhóm biểu đồ theo',{exact:true}).selectOption('quarter');await page.getByRole('button',{name:'Áp dụng',exact:true}).click();await expect(page.locator('canvas').first()).toBeVisible();await page.screenshot({path:testInfo.outputPath('admin-dashboard.png'),fullPage:true});
  await page.getByRole('button',{name:'Đơn hàng',exact:true}).click();await page.getByRole('button',{name:'Xem chi tiết',exact:true}).first().click();await expect(page.getByRole('heading',{name:'Chi tiết đơn',exact:true})).toBeVisible();await expect(page.getByText('Loyalty discount',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Khách hàng',exact:true}).click();await expect(page.getByRole('heading',{name:'Quản lý khách hàng'})).toBeVisible();await page.getByRole('button',{name:'Sản phẩm',exact:true}).click();await expect(page.getByRole('heading',{name:'Quản lý sản phẩm'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('PC Builder returns in-budget compatible parts and an honest explanation',async({page},testInfo)=>{
  await page.goto('/build-pc');await page.getByLabel('Ngân sách (VND)',{exact:true}).fill('25000000');await page.getByRole('button',{name:'Đề xuất cấu hình',exact:true}).click();await expect(page.getByRole('heading',{name:'Cấu hình đề xuất',exact:true})).toBeVisible({timeout:35000});await expect(page.getByText('Nguồn có 30% dự phòng',{exact:true})).toBeVisible();await expect(page.locator('article')).toHaveCount(8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:testInfo.outputPath('pc-builder.png'),fullPage:true});
});
