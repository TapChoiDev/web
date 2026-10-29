require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Shared SVG placeholder generator
function createTechPlaceholder(label, subtitle, color = '#2563EB') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <rect width="600" height="450" fill="#F8FAFC"/>
    <rect x="20" y="20" width="560" height="410" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
    <circle cx="300" cy="180" r="70" fill="${color}" fill-opacity="0.1"/>
    <path d="M260 170 L340 170 L340 210 L260 210 Z M280 210 L280 230 L320 230 L320 210" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="300" y="280" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0F172A" text-anchor="middle">${label}</text>
    <text x="300" y="310" font-family="sans-serif" font-size="14" fill="#64748B" text-anchor="middle">${subtitle}</text>
    <text x="300" y="390" font-family="sans-serif" font-size="12" font-weight="600" fill="${color}" text-anchor="middle">Store Anh GENUINE HARDWARE</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const CATEGORIES = [
  { id: 'laptop-van-phong', name: 'Laptop Văn Phòng', icon: 'laptop' },
  { id: 'laptop-gaming', name: 'Laptop Gaming', icon: 'gamepad-2' },
  { id: 'pc-gaming', name: 'PC Gaming', icon: 'cpu' },
  { id: 'pc-van-phong', name: 'PC Văn Phòng', icon: 'monitor' },
  { id: 'cpu', name: 'CPU - Bộ Vi Xử Lý', icon: 'microchip' },
  { id: 'vga', name: 'Card Đồ Họa (VGA)', icon: 'circuit-board' },
  { id: 'ram', name: 'Bộ Nhớ RAM', icon: 'memory-stick' },
  { id: 'ssd', name: 'Ổ Cứng SSD / HDD', icon: 'hard-drive' },
  { id: 'man-hinh', name: 'Màn Hình Máy Tính', icon: 'tv' },
  { id: 'phu-kien', name: 'Bàn Phím, Chuột & Phụ Kiện', icon: 'mouse' }
];

const PRODUCTS = [
  {
    sku: 'LAP-ASUS-G16',
    name: 'Laptop Gaming ASUS ROG Strix G16 G614JVR Core i9 14900HX / RTX 4070 8GB / 32GB RAM / 1TB SSD',
    brand: 'ASUS',
    category_id: 'laptop-gaming',
    price: 49990000,
    original_price: 54990000,
    discount_percent: 9,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('ASUS ROG Strix G16', 'Intel Core i9 14900HX • RTX 4070'),
    rating: 4.9,
    review_count: 42,
    is_featured: 1,
    is_bestseller: 1,
    is_new: 1,
    description: 'ASUS ROG Strix G16 là cỗ máy chiến game đỉnh cao thế hệ mới. Trang bị vi xử lý Intel Core i9 thế hệ 14 mới nhất cùng card đồ họa NVIDIA GeForce RTX 4070, tản nhiệt 3 quạt thông minh ROG Intelligent Cooling giúp cỗ máy vận hành ổn định tối đa dưới mọi mức tải nặng.',
    specs: {
      'CPU': 'Intel Core i9-14900HX (24 nhân, 32 luồng, Turbo up to 5.8 GHz)',
      'RAM': '32GB DDR5 5600MHz (2x16GB, nâng cấp max 64GB)',
      'Ổ cứng': '1TB PCIe 4.0 NVMe M.2 SSD',
      'Card đồ họa (GPU)': 'NVIDIA GeForce RTX 4070 8GB GDDR6 (140W TGP)',
      'Màn hình': '16" QHD+ (2560x1600) 240Hz, 100% DCI-P3, ROG Nebula Display',
      'Trọng lượng': '2.5 kg',
      'Hệ điều hành': 'Windows 11 Home bản quyền',
      'Bảo hành': '24 tháng chính hãng ASUS'
    }
  },
  {
    sku: 'LAP-APPLE-MBA15',
    name: 'Apple MacBook Air 15 inch M2 2023 (16GB RAM / 512GB SSD / Midnight)',
    brand: 'Apple',
    category_id: 'laptop-van-phong',
    price: 35490000,
    original_price: 38990000,
    discount_percent: 9,
    stock: 18,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('MacBook Air 15 M2', 'Apple M2 Chip • 16GB • 512GB'),
    rating: 4.8,
    review_count: 56,
    is_featured: 1,
    is_bestseller: 1,
    is_new: 0,
    description: 'MacBook Air 15 inch với chip M2 mang lại sự cân bằng hoàn hảo giữa màn hình Liquid Retina rộng lớn và thiết kế siêu mỏng nhẹ. Thời lượng pin cực khủng lên tới 18 giờ liên tục, vận hành hoàn toàn không cần quạt tản nhiệt yên tĩnh tuyệt đối.',
    specs: {
      'CPU': 'Apple M2 Chip (8 nhân CPU với 4 nhân hiệu năng & 4 nhân tiết kiệm điện)',
      'RAM': '16GB Unified Memory',
      'Ổ cứng': '512GB SSD siêu tốc',
      'Card đồ họa (GPU)': '10 nhân GPU',
      'Màn hình': '15.3 inch Liquid Retina (2880 x 1864), 500 nits, dải màu P3',
      'Trọng lượng': '1.51 kg',
      'Hệ điều hành': 'macOS Sequoia mới nhất',
      'Bảo hành': '12 tháng chính hãng Apple Care'
    }
  },
  {
    sku: 'LAP-DELL-INSP14',
    name: 'Laptop Dell Inspiron 14 5440 Core 5 120U / 16GB RAM / 512GB SSD / 14 inch FHD+ IPS',
    brand: 'Dell',
    category_id: 'laptop-van-phong',
    price: 16990000,
    original_price: 18990000,
    discount_percent: 11,
    stock: 24,
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('Dell Inspiron 14 5440', 'Intel Core 5 120U • 16GB • 512GB'),
    rating: 4.7,
    review_count: 31,
    is_featured: 0,
    is_bestseller: 1,
    is_new: 1,
    description: 'Dell Inspiron 14 5440 được chế tác từ hợp kim nhôm sang trọng, thiết kế viền mỏng tối ưu diện tích hiển thị. Phục vụ hoàn hảo cho học tập, công việc văn phòng, lập trình và xử lý số liệu đa nhiệm mượt mà.',
    specs: {
      'CPU': 'Intel Core 5 120U (10 nhân, 12 luồng, Turbo up to 5.0 GHz)',
      'RAM': '16GB DDR5 5200MHz',
      'Ổ cứng': '512GB M.2 PCIe NVMe SSD',
      'Card đồ họa (GPU)': 'Intel Graphics',
      'Màn hình': '14.0 inch FHD+ (1920x1200) Anti-Glare, ComfortView',
      'Trọng lượng': '1.54 kg',
      'Hệ điều hành': 'Windows 11 Home + Office Home & Student 2021 bản quyền',
      'Bảo hành': '12 tháng tận nơi ProSupport Dell'
    }
  },
  {
    sku: 'PC-GAME-RTX4070S',
    name: 'PC Gaming Store Anh Ultra i7 14700F / RTX 4070 Super 12GB / 32GB RAM DDR5 / 1TB NVMe / Tản Nước AIO 360',
    brand: 'Store Anh',
    category_id: 'pc-gaming',
    price: 38890000,
    original_price: 42500000,
    discount_percent: 8,
    stock: 7,
    image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('PC Gaming Ultra RTX 4070S', 'i7 14700F • 32GB DDR5 • RTX 4070 Super'),
    rating: 5.0,
    review_count: 19,
    is_featured: 1,
    is_bestseller: 1,
    is_new: 1,
    description: 'Cỗ máy PC Gaming lắp ráp chuyên nghiệp từ linh kiện tuyển chọn hàng đầu. Đáp ứng chiến mượt mà mọi tựa game AAA ở độ phân giải 2K, 4K cùng các tác vụ đồ họa 3D Render, dựng video chuyên nghiệp.',
    specs: {
      'CPU': 'Intel Core i7-14700F (20 nhân, 28 luồng, up to 5.4 GHz)',
      'Tản nhiệt': 'Tản nhiệt nước AIO Deepcool LT720 360mm RGB',
      'Mainboard': 'MSI B760M GAMING PLUS WIFI DDR5',
      'RAM': '32GB (2x16GB) Corsair Vengeance RGB DDR5 6000MHz',
      'Ổ cứng': '1TB SSD Samsung 980 PCIe 3.0 NVMe M.2',
      'Card đồ họa (GPU)': 'Gigabyte GeForce RTX 4070 Super EAGLE OC 12GB GDDR6X',
      'Nguồn (PSU)': 'Corsair RM750e 750W 80 Plus Gold ATX 3.0',
      'Vỏ case': 'NZXT H6 Flow RGB White kính cường lực',
      'Bảo hành': '36 tháng chính hãng từng linh kiện'
    }
  },
  {
    sku: 'PC-OFFICE-I5',
    name: 'PC Văn Phòng Pro Core i5 13400 / 16GB RAM / 512GB SSD NVMe / Nguồn CST 500W',
    brand: 'Store Anh',
    category_id: 'pc-van-phong',
    price: 9890000,
    original_price: 11500000,
    discount_percent: 14,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('PC Văn Phòng Pro i5', 'Core i5 13400 • 16GB • 512GB SSD'),
    rating: 4.6,
    review_count: 28,
    is_featured: 0,
    is_bestseller: 0,
    is_new: 0,
    description: 'Bộ máy tính bàn văn phòng thiết kế tinh gọn, bền bỉ và tiết kiệm điện năng. Khởi động máy chỉ trong 5 giây, xử lý dữ liệu Excel hàng trăm nghìn dòng và phần mềm kế toán mượt mà.',
    specs: {
      'CPU': 'Intel Core i5-13400 (10 nhân, 16 luồng, Turbo up to 4.6 GHz)',
      'Mainboard': 'ASUS PRIME H610M-K D4',
      'RAM': '16GB Kingston Fury Beast DDR4 3200MHz',
      'Ổ cứng': '512GB Kingston NV2 PCIe 4.0 NVMe SSD',
      'Card đồ họa (GPU)': 'Intel UHD Graphics 730 tích hợp',
      'Nguồn (PSU)': 'Xigmatek X-Power III 500W',
      'Vỏ case': 'Xigmatek XAS-22 Mini Tower thanh lịch',
      'Bảo hành': '36 tháng 1 đổi 1 trong 30 ngày'
    }
  },
  {
    sku: 'VGA-RTX4080S-ROG',
    name: 'Card Màn Hình ASUS ROG Strix GeForce RTX 4080 SUPER 16GB GDDR6X OC Edition',
    brand: 'ASUS',
    category_id: 'vga',
    price: 32990000,
    original_price: 35900000,
    discount_percent: 8,
    stock: 5,
    image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('ASUS ROG RTX 4080 SUPER', '16GB GDDR6X • DLSS 3.5 • OC Edition'),
    rating: 5.0,
    review_count: 14,
    is_featured: 1,
    is_bestseller: 0,
    is_new: 1,
    description: 'ASUS ROG Strix GeForce RTX 4080 SUPER mang lại một định nghĩa hoàn toàn mới về hiệu năng đồ họa tối thượng. Hệ thống quạt tản nhiệt Axial-tech lớn hơn kết hợp khung kim loại nguyên khối gia cường.',
    specs: {
      'Nhân đồ họa': 'NVIDIA GeForce RTX 4080 SUPER',
      'Bộ nhớ': '16GB GDDR6X 256-bit',
      'Xung nhịp OC': '2670 MHz (OC mode) / 2640 MHz (Default)',
      'Cổng xuất hình': '2x HDMI 2.1a, 3x DisplayPort 1.4a',
      'Nguồn khuyến nghị': '850W (Cổng cấp nguồn 16-pin 12VHPWR)',
      'Kích thước': '357.6 x 149.3 x 70.1 mm (3.5 slot)',
      'Bảo hành': '36 tháng chính hãng'
    }
  },
  {
    sku: 'CPU-INTEL-I9-14900K',
    name: 'Bộ Vi Xử Lý Intel Core i9 14900K (Up to 6.0GHz, 24 Nhân 32 Luồng, 36MB Cache, LGA1700)',
    brand: 'Intel',
    category_id: 'cpu',
    price: 14790000,
    original_price: 15990000,
    discount_percent: 8,
    stock: 9,
    image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('Intel Core i9 14900K', '24 Cores • 32 Threads • Up to 6.0 GHz'),
    rating: 4.8,
    review_count: 22,
    is_featured: 0,
    is_bestseller: 1,
    is_new: 0,
    description: 'Bộ vi xử lý hàng đầu dành cho máy tính để bàn từ Intel. Xung nhịp đơn nhân tối đa chạm mốc 6.0GHz cho trải nghiệm gaming và render nặng không một chút độ trễ.',
    specs: {
      'Số nhân / Số luồng': '24 nhân (8 P-Core + 16 E-Core) / 32 luồng',
      'Xung nhịp Turbo tối đa': '6.0 GHz (Intel Thermal Velocity Boost)',
      'Bộ nhớ đệm (Cache)': '36MB Intel Smart Cache',
      'Socket': 'LGA 1700 (Tương thích Z790, Z690)',
      'Hỗ trợ RAM': 'DDR5 5600 MT/s, DDR4 3200 MT/s',
      'Điện năng tiêu thụ (TDP)': '125W (Cơ bản) / 253W (Turbo tối đa)',
      'Bảo hành': '36 tháng chính hãng Intel Box'
    }
  },
  {
    sku: 'CPU-AMD-R7-7800X3D',
    name: 'Bộ Vi Xử Lý AMD Ryzen 7 7800X3D (Up to 5.0GHz, 8 Nhân 16 Luồng, 96MB V-Cache, AM5)',
    brand: 'AMD',
    category_id: 'cpu',
    price: 10490000,
    original_price: 11990000,
    discount_percent: 12,
    stock: 14,
    image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('AMD Ryzen 7 7800X3D', 'V-Cache Gaming King • 8 Cores • 16 Threads'),
    rating: 4.9,
    review_count: 37,
    is_featured: 0,
    is_bestseller: 1,
    is_new: 0,
    description: 'Ông vua hiệu năng chơi game thế giới thực. Trang bị công nghệ 3D V-Cache độc quyền của AMD nâng bộ nhớ đệm lên tới 104MB, tối ưu mức FPS vượt trội trong hầu hết các tựa game esports và AAA.',
    specs: {
      'Số nhân / Số luồng': '8 nhân / 16 luồng',
      'Xung nhịp': '4.2 GHz (Base) / 5.0 GHz (Boost)',
      'Bộ nhớ đệm L3': '96MB 3D V-Cache (Tổng Cache 104MB)',
      'Socket': 'AM5 (Tương thích bo mạch chủ dòng X670, B650)',
      'Hỗ trợ RAM': 'DDR5 kênh đôi',
      'Điện năng tiêu thụ (TDP)': '120W',
      'Bảo hành': '36 tháng chính hãng AMD Box'
    }
  },
  {
    sku: 'MON-LG-27GR75Q',
    name: 'Màn Hình Gaming LG UltraGear 27GR75Q-B 27 inch 2K QHD IPS 165Hz 1ms sRGB 99%',
    brand: 'LG',
    category_id: 'man-hinh',
    price: 5790000,
    original_price: 6990000,
    discount_percent: 17,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('LG UltraGear 27GR75Q', '27" 2K QHD • 165Hz 1ms • IPS sRGB 99%'),
    rating: 4.8,
    review_count: 45,
    is_featured: 1,
    is_bestseller: 1,
    is_new: 0,
    description: 'Màn hình máy tính gaming 27 inch chuẩn tỉ lệ vàng. Tấm nền IPS cho góc nhìn rộng và màu sắc trung thực sRGB 99%, tần số quét 165Hz cùng thời gian phản hồi 1ms siêu tốc tương thích NVIDIA G-SYNC và AMD FreeSync Premium.',
    specs: {
      'Kích thước': '27 inch phẳng',
      'Độ phân giải': 'QHD 2K (2560 x 1440)',
      'Tấm nền': 'IPS góc nhìn 178/178 độ',
      'Tần số quét': '165Hz',
      'Thời gian phản hồi': '1ms (GtG at Faster)',
      'Độ phủ màu': 'sRGB 99% (CIE1931), hỗ trợ HDR10',
      'Cổng kết nối': '2x HDMI 2.0, 1x DisplayPort 1.4, Jack tai nghe 3.5mm',
      'Bảo hành': '24 tháng chính hãng LG Việt Nam'
    }
  },
  {
    sku: 'MON-DELL-U2424H',
    name: 'Màn Hình Dell UltraSharp U2424H 23.8 inch FHD IPS 120Hz Chuyên Đồ Họa & Văn Phòng',
    brand: 'Dell',
    category_id: 'man-hinh',
    price: 5490000,
    original_price: 6200000,
    discount_percent: 11,
    stock: 16,
    image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('Dell UltraSharp U2424H', '23.8" FHD IPS • 120Hz • 100% sRGB 85% DCI-P3'),
    rating: 4.9,
    review_count: 50,
    is_featured: 0,
    is_bestseller: 1,
    is_new: 1,
    description: 'Dòng màn hình chuyên nghiệp UltraSharp đỉnh cao của Dell. Trang bị tần số quét 120Hz mượt mà lần đầu tiên trên màn hình văn phòng, cảm biến ánh sáng tự điều chỉnh độ sáng bảo vệ mắt người dùng làm việc cả ngày.',
    specs: {
      'Kích thước': '23.8 inch viền siêu mỏng 4 cạnh',
      'Độ phân giải': 'FHD (1920 x 1080) tỉ lệ 16:9',
      'Tấm nền': 'IPS chống chói 3H, 120Hz',
      'Độ chuẩn màu': '100% sRGB, 100% BT.709, 85% DCI-P3 (Delta E < 2)',
      'Chân đế': 'Nâng hạ, xoay dọc 90 độ, xoay trái phải, gập nghiêng',
      'Cổng kết nối': 'DisplayPort 1.4, HDMI, USB-C upstream, USB 3.2 hub',
      'Bảo hành': '36 tháng 1 đổi 1 tận nơi Dell Premium Panel Exchange'
    }
  },
  {
    sku: 'RAM-KINGSTON-32GB-DDR5',
    name: 'RAM Desktop Kingston Fury Beast RGB 32GB (2x16GB) DDR5 6000MHz CL36',
    brand: 'Kingston',
    category_id: 'ram',
    price: 2990000,
    original_price: 3450000,
    discount_percent: 13,
    stock: 28,
    image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('Kingston Fury Beast RGB', '32GB (2x16GB) • DDR5 6000MHz • RGB Lighting'),
    rating: 4.8,
    review_count: 33,
    is_featured: 0,
    is_bestseller: 0,
    is_new: 0,
    description: 'Cặp RAM DDR5 hiệu năng cao kết hợp dải LED RGB tùy biến bắt mắt. Hỗ trợ đầy đủ Intel XMP 3.0 và AMD EXPO giúp ép xung tự động dễ dàng bằng một cú nhấp chuột trong BIOS.',
    specs: {
      'Dung lượng': '32GB (Kit 2x16GB)',
      'Chuẩn RAM': 'DDR5 Desktop',
      'Tốc độ Bus': '6000 MHz',
      'Độ trễ CAS (Latency)': 'CL36-38-38',
      'Điện áp': '1.35V',
      'Tản nhiệt & LED': 'Tản nhiệt nhôm đen cao cấp, LED RGB đồng bộ',
      'Bảo hành': '36 tháng chính hãng Viễn Sơn / SPC'
    }
  },
  {
    sku: 'SSD-SAMSUNG-990PRO-1TB',
    name: 'Ổ Cứng SSD Samsung 990 Pro 1TB M.2 PCIe 4.0 NVMe (Đọc 7450MB/s - Ghi 6900MB/s)',
    brand: 'Samsung',
    category_id: 'ssd',
    price: 2790000,
    original_price: 3190000,
    discount_percent: 13,
    stock: 22,
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('Samsung 990 Pro 1TB', 'PCIe 4.0 NVMe • Đọc 7450MB/s • Ghi 6900MB/s'),
    rating: 5.0,
    review_count: 68,
    is_featured: 0,
    is_bestseller: 1,
    is_new: 0,
    description: 'SSD chuẩn PCIe Gen 4.0 nhanh nhất thế giới của Samsung. Tốc độ đọc lên tới 7450 MB/s, quản lý nhiệt lượng thông minh bằng lớp phủ niken và thuật toán Dynamic Thermal Guard độc quyền.',
    specs: {
      'Dung lượng': '1TB',
      'Chuẩn kết nối': 'PCIe Gen 4.0 x4, NVMe 2.0',
      'Kích thước': 'M.2 2280',
      'Tốc độ đọc tuần tự': 'Lên tới 7,450 MB/s',
      'Tốc độ ghi tuần tự': 'Lên tới 6,900 MB/s',
      'Độ bền ghi (TBW)': '600 TBW',
      'Bảo hành': '60 tháng chính hãng Samsung'
    }
  },
  {
    sku: 'GEAR-KEY-OG87',
    name: 'Bàn Phím Cơ Không Dây FL-Esports OG87 Retro White TKL 3 Mode / Kailh Box Jellyfish Switch',
    brand: 'FL-Esports',
    category_id: 'phu-kien',
    price: 1890000,
    original_price: 2200000,
    discount_percent: 14,
    stock: 19,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('FL-Esports OG87 Retro', 'Wireless 3-Mode • Gasket Mount • Hot-swap'),
    rating: 4.9,
    review_count: 29,
    is_featured: 0,
    is_bestseller: 0,
    is_new: 1,
    description: 'Bàn phím cơ thiết kế phong cách hoài cổ Retro thập niên 90. Cấu trúc Gasket Mount lót đầy đủ foam tiêu âm cho âm thanh gõ đầm ấm, êm ái, kết nối 3 chế độ Bluetooth 5.0 / Wireless 2.4Ghz / Type-C.',
    specs: {
      'Bố cục phím': 'Tenkeyless 87 phím gọn gàng',
      'Kết nối': '3 Chế độ: Type-C, Bluetooth 5.0, Wireless 2.4GHz',
      'Switch': 'Kailh Box Ice Jellyfish (Pre-lubed mượt mà)',
      'Keycap': 'PBT Double-shot độ bền vĩnh cửu không bóng',
      'Hotswap': 'Mạch xuôi 5-pin hotswap mọi loại switch',
      'Pin': 'Dung lượng 4000mAh dùng 3-4 tuần',
      'Bảo hành': '12 tháng chính hãng'
    }
  },
  {
    sku: 'GEAR-MOUSE-G502X',
    name: 'Chuột Gaming Không Dây Logitech G502 X PLUS Wireless LIGHTSPEED RGB Hero 25K',
    brand: 'Logitech',
    category_id: 'phu-kien',
    price: 2990000,
    original_price: 3490000,
    discount_percent: 14,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('Logitech G502 X PLUS', 'LIGHTSPEED • Hero 25K • Lightforce Switch'),
    rating: 4.8,
    review_count: 52,
    is_featured: 1,
    is_bestseller: 1,
    is_new: 0,
    description: 'Phiên bản cải tiến thế hệ mới của huyền thoại chuột gaming G502. Trang bị switch quang cơ học lai LIGHTFORCE đầu tiên, cảm biến Hero 25K chuẩn xác đến từng micromet và công nghệ LIGHTSYNC RGB 8 vùng.',
    specs: {
      'Cảm biến': 'HERO 25K (100 - 25,600 DPI, không gia tốc)',
      'Switch': 'Quang - Cơ học LIGHTFORCE siêu bền',
      'Kết nối': 'Không dây LIGHTSPEED và cáp sạc USB-C',
      'Trọng lượng': '106 gram cân đối hoàn hảo',
      'Số nút bấm': '13 nút có thể lập trình macro qua G-HUB',
      'Thời lượng pin': 'Lên tới 120 giờ liên tục (37 giờ khi bật RGB)',
      'Bảo hành': '24 tháng chính hãng Digiworld / Synnex FPT'
    }
  },
  {
    sku: 'LAP-ACER-HELIOS16',
    name: 'Laptop Gaming Acer Predator Helios 16 PH16-71 Core i7 13700HX / RTX 4060 8GB / 16GB / 512GB / 165Hz',
    brand: 'Acer',
    category_id: 'laptop-gaming',
    price: 36990000,
    original_price: 41990000,
    discount_percent: 12,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('Acer Predator Helios 16', 'i7 13700HX • RTX 4060 140W • 165Hz 2K'),
    rating: 4.7,
    review_count: 20,
    is_featured: 0,
    is_bestseller: 0,
    is_new: 0,
    description: 'Predator Helios 16 trang bị công nghệ tản nhiệt quạt kim loại 3D AeroBlade thế hệ thứ 5 và keo tản nhiệt kim loại lỏng trên CPU, mang lại hiệu năng ổn định vượt bậc cho game thủ chuyên nghiệp.',
    specs: {
      'CPU': 'Intel Core i7-13700HX (16 nhân, 24 luồng, up to 5.0 GHz)',
      'RAM': '16GB DDR5 4800MHz (Nâng cấp tối đa 32GB)',
      'Ổ cứng': '512GB PCIe NVMe SSD',
      'Card đồ họa (GPU)': 'NVIDIA GeForce RTX 4060 8GB GDDR6 (140W max TGP)',
      'Màn hình': '16" WQXGA (2560x1600) IPS 165Hz, 100% sRGB, 500 nits',
      'Bảo hành': '12 tháng bảo hành nhanh 3S1 của Acer'
    }
  },
  {
    sku: 'VGA-ASUS-4060TI',
    name: 'Card Màn Hình ASUS Dual GeForce RTX 4060 Ti EVO OC Edition 8GB GDDR6',
    brand: 'ASUS',
    category_id: 'vga',
    price: 10990000,
    original_price: 12490000,
    discount_percent: 12,
    stock: 17,
    image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80',
    fallback_image: createTechPlaceholder('ASUS Dual RTX 4060 Ti', '8GB GDDR6 • Dual Fan Axial-tech • DLSS 3'),
    rating: 4.6,
    review_count: 25,
    is_featured: 0,
    is_bestseller: 0,
    is_new: 1,
    description: 'Chiếc card đồ họa quốc dân thế hệ RTX 40 Series với thiết kế 2 quạt gọn gàng dễ lắp đặt trong mọi thùng máy. Kiến trúc Ada Lovelace tiết kiệm điện và hỗ trợ đầy đủ công nghệ DLSS 3 nhân khung hình bằng AI.',
    specs: {
      'Nhân đồ họa': 'NVIDIA GeForce RTX 4060 Ti',
      'Bộ nhớ': '8GB GDDR6 128-bit',
      'Cổng giao tiếp': 'PCI Express 4.0 x8',
      'Cổng xuất hình': '1x HDMI 2.1a, 3x DisplayPort 1.4a',
      'Nguồn khuyến nghị': '650W (1 đầu cấp nguồn 8-pin)',
      'Bảo hành': '36 tháng chính hãng'
    }
  }
];

async function seed() {
  console.log('--- BẮT ĐẦU NẠP DỮ LIỆU SEED CHO Store Anh ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'webbanmt_db'
  });

  try {
    // 1. Roles
    console.log('[1/6] Nạp bảng Roles...');
    await connection.query(`
      INSERT INTO roles (id, name, description) VALUES
      (1, 'admin', 'Quản trị viên toàn quyền hệ thống'),
      (2, 'customer', 'Khách hàng thành viên')
      ON DUPLICATE KEY UPDATE description = VALUES(description);
    `);

    // 2. Users with hashed passwords
    console.log('[2/6] Nạp bảng Users (Băm mật khẩu an toàn bằng bcrypt)...');
    const adminPassHash = await bcrypt.hash('admin123', 10);
    const userPassHash = await bcrypt.hash('123456', 10);

    const users = [
      [1, 1, 'Quản Trị Viên Hệ Thống', 'admin@webbanmt.vn', 'admin', '0901234567', 'Trụ sở Store Anh, Tầng 8 Tòa nhà Công Nghệ, Cầu Giấy, Hà Nội', adminPassHash, 'active'],
      [2, 2, 'Nguyễn Văn An', 'khachhang@gmail.com', 'user1', '0912345678', 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội', userPassHash, 'active'],
      [3, 2, 'Trần Thanh Bình', 'tranbinh@gmail.com', 'tranbinh', '0987654321', 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh', userPassHash, 'active']
    ];

    for (const u of users) {
      await connection.query(`
        INSERT INTO users (id, role_id, full_name, email, username, phone, address, password_hash, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          phone = VALUES(phone),
          address = VALUES(address),
          password_hash = VALUES(password_hash),
          status = VALUES(status);
      `, u);
    }

    // 3. Categories
    console.log('[3/6] Nạp bảng Categories...');
    for (const cat of CATEGORIES) {
      await connection.query(`
        INSERT INTO categories (id, name, icon)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon);
      `, [cat.id, cat.name, cat.icon]);
    }

    // 4. Products & Initial Stock Transactions
    console.log('[4/6] Nạp bảng Products...');
    for (const p of PRODUCTS) {
      const [res] = await connection.query(`
        INSERT INTO products (
          sku, name, brand, category_id, price, original_price, discount_percent,
          stock, image, fallback_image, description, specs_json, rating, review_count,
          is_featured, is_bestseller, is_new
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          brand = VALUES(brand),
          category_id = VALUES(category_id),
          price = VALUES(price),
          original_price = VALUES(original_price),
          discount_percent = VALUES(discount_percent),
          stock = VALUES(stock),
          image = VALUES(image),
          fallback_image = VALUES(fallback_image),
          description = VALUES(description),
          specs_json = VALUES(specs_json),
          rating = VALUES(rating),
          review_count = VALUES(review_count),
          is_featured = VALUES(is_featured),
          is_bestseller = VALUES(is_bestseller),
          is_new = VALUES(is_new);
      `, [
        p.sku, p.name, p.brand, p.category_id, p.price, p.original_price, p.discount_percent,
        p.stock, p.image, p.fallback_image, p.description, JSON.stringify(p.specs), p.rating,
        p.review_count, p.is_featured, p.is_bestseller, p.is_new
      ]);

      const productId = res.insertId || (await connection.query('SELECT id FROM products WHERE sku = ?', [p.sku]))[0][0].id;

      // Seed initial inventory audit record if not present
      await connection.query(`
        INSERT INTO inventory_transactions (product_id, type, quantity, balance_after, note)
        SELECT ?, 'INITIAL_STOCK', ?, ?, 'Khởi tạo tồn kho ban đầu'
        WHERE NOT EXISTS (
          SELECT 1 FROM inventory_transactions WHERE product_id = ? AND type = 'INITIAL_STOCK'
        );
      `, [productId, p.stock, p.stock, productId]);
    }

    // 5. Initial Demo Orders, Order Items & Payments
    console.log('[5/6] Nạp bảng Orders, Order Items & Payments mẫu...');

    // Fetch product IDs
    const [dbProducts] = await connection.query('SELECT id, sku, name, price, image FROM products');
    const prodMap = {};
    dbProducts.forEach(p => { prodMap[p.sku] = p; });

    // Order 1: Delivered COD order for user 2
    const pMac = prodMap['LAP-APPLE-MBA15'];
    const pMouse = prodMap['GEAR-MOUSE-G502X'];
    if (pMac && pMouse) {
      const total1 = pMac.price + pMouse.price;
      await connection.query(`
        INSERT INTO orders (
          order_code, user_id, customer_name, customer_phone, customer_email,
          shipping_address, order_note, payment_method, payment_status, order_status,
          subtotal, shipping_fee, total, created_at, delivered_at
        ) VALUES (
          'ORD-8821', 2, 'Nguyễn Văn An', '0912345678', 'khachhang@gmail.com',
          'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
          'Giao giờ hành chính, gọi trước 15 phút giúp mình.', 'COD', 'paid', 'da_giao',
          ?, 0, ?, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)
        ) ON DUPLICATE KEY UPDATE order_status = VALUES(order_status);
      `, [total1, total1]);

      const [o1] = await connection.query('SELECT id FROM orders WHERE order_code = ?', ['ORD-8821']);
      const orderId1 = o1[0].id;

      await connection.query(`
        INSERT IGNORE INTO order_items (order_id, product_id, product_sku, product_name, product_price, quantity, subtotal, image)
        VALUES
        (?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, 1, ?, ?);
      `, [
        orderId1, pMac.id, pMac.sku, pMac.name, pMac.price, pMac.price, pMac.image,
        orderId1, pMouse.id, pMouse.sku, pMouse.name, pMouse.price, pMouse.price, pMouse.image
      ]);

      await connection.query(`
        INSERT IGNORE INTO payments (order_id, payment_method, amount, status)
        VALUES (?, 'COD', ?, 'success');
      `, [orderId1, total1]);
    }

    // Order 2: VNPAY Paid Order in transit
    const pLG = prodMap['MON-LG-27GR75Q'];
    if (pLG) {
      await connection.query(`
        INSERT INTO orders (
          order_code, user_id, customer_name, customer_phone, customer_email,
          shipping_address, order_note, payment_method, payment_status, order_status,
          subtotal, shipping_fee, total, transaction_no, created_at
        ) VALUES (
          'ORD-8822', 2, 'Nguyễn Văn An', '0912345678', 'khachhang@gmail.com',
          'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
          'Đóng gói bọc bóng xốp cẩn thận.', 'VNPAY', 'paid', 'dang_giao',
          ?, 0, ?, 'VNP14299831', DATE_SUB(NOW(), INTERVAL 1 DAY)
        ) ON DUPLICATE KEY UPDATE order_status = VALUES(order_status);
      `, [pLG.price, pLG.price]);

      const [o2] = await connection.query('SELECT id FROM orders WHERE order_code = ?', ['ORD-8822']);
      const orderId2 = o2[0].id;

      await connection.query(`
        INSERT IGNORE INTO order_items (order_id, product_id, product_sku, product_name, product_price, quantity, subtotal, image)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?);
      `, [orderId2, pLG.id, pLG.sku, pLG.name, pLG.price, pLG.price, pLG.image]);

      await connection.query(`
        INSERT IGNORE INTO payments (order_id, payment_method, amount, transaction_no, response_code, bank_code, status)
        VALUES (?, 'VNPAY', ?, 'VNP14299831', '00', 'NCB', 'success');
      `, [orderId2, pLG.price]);
    }

    // Order 3: Pending Order for user 3
    const pPC = prodMap['PC-GAME-RTX4070S'];
    if (pPC) {
      await connection.query(`
        INSERT INTO orders (
          order_code, user_id, customer_name, customer_phone, customer_email,
          shipping_address, order_note, payment_method, payment_status, order_status,
          subtotal, shipping_fee, total, created_at
        ) VALUES (
          'ORD-8823', 3, 'Trần Thanh Bình', '0987654321', 'tranbinh@gmail.com',
          'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
          'Xuất hóa đơn công ty nếu có.', 'COD', 'pending', 'cho_xac_nhan',
          ?, 0, ?, NOW()
        ) ON DUPLICATE KEY UPDATE order_status = VALUES(order_status);
      `, [pPC.price, pPC.price]);

      const [o3] = await connection.query('SELECT id FROM orders WHERE order_code = ?', ['ORD-8823']);
      const orderId3 = o3[0].id;

      await connection.query(`
        INSERT IGNORE INTO order_items (order_id, product_id, product_sku, product_name, product_price, quantity, subtotal, image)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?);
      `, [orderId3, pPC.id, pPC.sku, pPC.name, pPC.price, pPC.price, pPC.image]);
    }

    console.log('[6/6] Hoàn tất nạp dữ liệu seed thành công!');
    console.log('✅ DATABASE ĐÃ SẴN SÀNG CHO DEMO VÀ ĐÁNH GIÁ!');
  } catch (error) {
    console.error('❌ Lỗi khi nạp seed data:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
