/**
 * Store Anh - Sample Data & Initial Seeds
 * High-quality computer products, categories, sample users, and initial orders.
 */

const INITIAL_CATEGORIES = [
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

// Reusable SVG placeholder generator for rock-solid image display
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

const INITIAL_PRODUCTS = [
  {
    id: 'prod-01',
    sku: 'LAP-ASUS-G16',
    name: 'Laptop Gaming ASUS ROG Strix G16 G614JVR Core i9 14900HX / RTX 4070 8GB / 32GB RAM / 1TB SSD',
    brand: 'ASUS',
    category: 'laptop-gaming',
    categoryName: 'Laptop Gaming',
    price: 49990000,
    originalPrice: 54990000,
    discountPercent: 9,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('ASUS ROG Strix G16', 'Intel Core i9 14900HX • RTX 4070'),
    gallery: [
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 12,
    rating: 4.9,
    reviewCount: 42,
    featured: true,
    bestSeller: true,
    isNew: true,
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
    id: 'prod-02',
    sku: 'LAP-APPLE-MBA15',
    name: 'Apple MacBook Air 15 inch M2 2023 (16GB RAM / 512GB SSD / Midnight)',
    brand: 'Apple',
    category: 'laptop-van-phong',
    categoryName: 'Laptop Văn Phòng',
    price: 35490000,
    originalPrice: 38990000,
    discountPercent: 9,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('MacBook Air 15 M2', 'Apple M2 Chip • 16GB • 512GB'),
    gallery: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 18,
    rating: 4.8,
    reviewCount: 56,
    featured: true,
    bestSeller: true,
    isNew: false,
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
    id: 'prod-03',
    sku: 'LAP-DELL-INSP14',
    name: 'Laptop Dell Inspiron 14 5440 Core 5 120U / 16GB RAM / 512GB SSD / 14 inch FHD+ IPS',
    brand: 'Dell',
    category: 'laptop-van-phong',
    categoryName: 'Laptop Văn Phòng',
    price: 16990000,
    originalPrice: 18990000,
    discountPercent: 11,
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('Dell Inspiron 14 5440', 'Intel Core 5 120U • 16GB • 512GB'),
    gallery: [
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 24,
    rating: 4.7,
    reviewCount: 31,
    featured: false,
    bestSeller: true,
    isNew: true,
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
    id: 'prod-04',
    sku: 'PC-GAME-RTX4070S',
    name: 'PC Gaming Store Anh Ultra i7 14700F / RTX 4070 Super 12GB / 32GB RAM DDR5 / 1TB NVMe / Tản Nước AIO 360',
    brand: 'Store Anh',
    category: 'pc-gaming',
    categoryName: 'PC Gaming',
    price: 38890000,
    originalPrice: 42500000,
    discountPercent: 8,
    image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('PC Gaming Ultra RTX 4070S', 'i7 14700F • 32GB DDR5 • RTX 4070 Super'),
    gallery: [
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 7,
    rating: 5.0,
    reviewCount: 19,
    featured: true,
    bestSeller: true,
    isNew: true,
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
    id: 'prod-05',
    sku: 'PC-OFFICE-I5',
    name: 'PC Văn Phòng Pro Core i5 13400 / 16GB RAM / 512GB SSD NVMe / Nguồn CST 500W',
    brand: 'Store Anh',
    category: 'pc-van-phong',
    categoryName: 'PC Văn Phòng',
    price: 9890000,
    originalPrice: 11500000,
    discountPercent: 14,
    image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('PC Văn Phòng Pro i5', 'Core i5 13400 • 16GB • 512GB SSD'),
    gallery: [
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 15,
    rating: 4.6,
    reviewCount: 28,
    featured: false,
    bestSeller: false,
    isNew: false,
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
    id: 'prod-06',
    sku: 'VGA-RTX4080S-ROG',
    name: 'Card Màn Hình ASUS ROG Strix GeForce RTX 4080 SUPER 16GB GDDR6X OC Edition',
    brand: 'ASUS',
    category: 'vga',
    categoryName: 'Card Đồ Họa (VGA)',
    price: 32990000,
    originalPrice: 35900000,
    discountPercent: 8,
    image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('ASUS ROG RTX 4080 SUPER', '16GB GDDR6X • DLSS 3.5 • OC Edition'),
    gallery: [
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 5,
    rating: 5.0,
    reviewCount: 14,
    featured: true,
    bestSeller: false,
    isNew: true,
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
    id: 'prod-07',
    sku: 'CPU-INTEL-I9-14900K',
    name: 'Bộ Vi Xử Lý Intel Core i9 14900K (Up to 6.0GHz, 24 Nhân 32 Luồng, 36MB Cache, LGA1700)',
    brand: 'Intel',
    category: 'cpu',
    categoryName: 'CPU - Bộ Vi Xử Lý',
    price: 14790000,
    originalPrice: 15990000,
    discountPercent: 8,
    image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('Intel Core i9 14900K', '24 Cores • 32 Threads • Up to 6.0 GHz'),
    gallery: [
      'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 9,
    rating: 4.8,
    reviewCount: 22,
    featured: false,
    bestSeller: true,
    isNew: false,
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
    id: 'prod-08',
    sku: 'CPU-AMD-R7-7800X3D',
    name: 'Bộ Vi Xử Lý AMD Ryzen 7 7800X3D (Up to 5.0GHz, 8 Nhân 16 Luồng, 96MB V-Cache, AM5)',
    brand: 'AMD',
    category: 'cpu',
    categoryName: 'CPU - Bộ Vi Xử Lý',
    price: 10490000,
    originalPrice: 11990000,
    discountPercent: 12,
    image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('AMD Ryzen 7 7800X3D', 'V-Cache Gaming King • 8 Cores • 16 Threads'),
    gallery: [
      'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 14,
    rating: 4.9,
    reviewCount: 37,
    featured: false,
    bestSeller: true,
    isNew: false,
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
    id: 'prod-09',
    sku: 'MON-LG-27GR75Q',
    name: 'Màn Hình Gaming LG UltraGear 27GR75Q-B 27 inch 2K QHD IPS 165Hz 1ms sRGB 99%',
    brand: 'LG',
    category: 'man-hinh',
    categoryName: 'Màn Hình Máy Tính',
    price: 5790000,
    originalPrice: 6990000,
    discountPercent: 17,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('LG UltraGear 27GR75Q', '27" 2K QHD • 165Hz 1ms • IPS sRGB 99%'),
    gallery: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 20,
    rating: 4.8,
    reviewCount: 45,
    featured: true,
    bestSeller: true,
    isNew: false,
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
    id: 'prod-10',
    sku: 'MON-DELL-U2424H',
    name: 'Màn Hình Dell UltraSharp U2424H 23.8 inch FHD IPS 120Hz Chuyên Đồ Họa & Văn Phòng',
    brand: 'Dell',
    category: 'man-hinh',
    categoryName: 'Màn Hình Máy Tính',
    price: 5490000,
    originalPrice: 6200000,
    discountPercent: 11,
    image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('Dell UltraSharp U2424H', '23.8" FHD IPS • 120Hz • 100% sRGB 85% DCI-P3'),
    gallery: [
      'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 16,
    rating: 4.9,
    reviewCount: 50,
    featured: false,
    bestSeller: true,
    isNew: true,
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
    id: 'prod-11',
    sku: 'RAM-KINGSTON-32GB-DDR5',
    name: 'RAM Desktop Kingston Fury Beast RGB 32GB (2x16GB) DDR5 6000MHz CL36',
    brand: 'Kingston',
    category: 'ram',
    categoryName: 'Bộ Nhớ RAM',
    price: 2990000,
    originalPrice: 3450000,
    discountPercent: 13,
    image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('Kingston Fury Beast RGB', '32GB (2x16GB) • DDR5 6000MHz • RGB Lighting'),
    gallery: [
      'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 28,
    rating: 4.8,
    reviewCount: 33,
    featured: false,
    bestSeller: false,
    isNew: false,
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
    id: 'prod-12',
    sku: 'SSD-SAMSUNG-990PRO-1TB',
    name: 'Ổ Cứng SSD Samsung 990 Pro 1TB M.2 PCIe 4.0 NVMe (Đọc 7450MB/s - Ghi 6900MB/s)',
    brand: 'Samsung',
    category: 'ssd',
    categoryName: 'Ổ Cứng SSD / HDD',
    price: 2790000,
    originalPrice: 3190000,
    discountPercent: 13,
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('Samsung 990 Pro 1TB', 'PCIe 4.0 NVMe • Đọc 7450MB/s • Ghi 6900MB/s'),
    gallery: [
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 22,
    rating: 5.0,
    reviewCount: 68,
    featured: false,
    bestSeller: true,
    isNew: false,
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
    id: 'prod-13',
    sku: 'GEAR-KEY-OG87',
    name: 'Bàn Phím Cơ Không Dây FL-Esports OG87 Retro White TKL 3 Mode / Kailh Box Jellyfish Switch',
    brand: 'FL-Esports',
    category: 'phu-kien',
    categoryName: 'Bàn Phím, Chuột & Phụ Kiện',
    price: 1890000,
    originalPrice: 2200000,
    discountPercent: 14,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('FL-Esports OG87 Retro', 'Wireless 3-Mode • Gasket Mount • Hot-swap'),
    gallery: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 19,
    rating: 4.9,
    reviewCount: 29,
    featured: false,
    bestSeller: false,
    isNew: true,
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
    id: 'prod-14',
    sku: 'GEAR-MOUSE-G502X',
    name: 'Chuột Gaming Không Dây Logitech G502 X PLUS Wireless LIGHTSPEED RGB Hero 25K',
    brand: 'Logitech',
    category: 'phu-kien',
    categoryName: 'Bàn Phím, Chuột & Phụ Kiện',
    price: 2990000,
    originalPrice: 3490000,
    discountPercent: 14,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('Logitech G502 X PLUS', 'LIGHTSPEED • Hero 25K • Lightforce Switch'),
    gallery: [
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 25,
    rating: 4.8,
    reviewCount: 52,
    featured: true,
    bestSeller: true,
    isNew: false,
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
    id: 'prod-15',
    sku: 'LAP-ACER-HELIOS16',
    name: 'Laptop Gaming Acer Predator Helios 16 PH16-71 Core i7 13700HX / RTX 4060 8GB / 16GB / 512GB / 165Hz',
    brand: 'Acer',
    category: 'laptop-gaming',
    categoryName: 'Laptop Gaming',
    price: 36990000,
    originalPrice: 41990000,
    discountPercent: 12,
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('Acer Predator Helios 16', 'i7 13700HX • RTX 4060 140W • 165Hz 2K'),
    gallery: [
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 8,
    rating: 4.7,
    reviewCount: 20,
    featured: false,
    bestSeller: false,
    isNew: false,
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
    id: 'prod-16',
    sku: 'VGA-ASUS-4060TI',
    name: 'Card Màn Hình ASUS Dual GeForce RTX 4060 Ti EVO OC Edition 8GB GDDR6',
    brand: 'ASUS',
    category: 'vga',
    categoryName: 'Card Đồ Họa (VGA)',
    price: 10990000,
    originalPrice: 12490000,
    discountPercent: 12,
    image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80',
    fallbackImage: createTechPlaceholder('ASUS Dual RTX 4060 Ti', '8GB GDDR6 • Dual Fan Axial-tech • DLSS 3'),
    gallery: [
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80'
    ],
    stock: 17,
    rating: 4.6,
    reviewCount: 25,
    featured: false,
    bestSeller: false,
    isNew: true,
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

const INITIAL_USERS = [
  {
    id: 'usr-admin-01',
    email: 'admin@webbanmt.vn',
    username: 'admin',
    passwordHash: 'admin123', // Demo simulation only
    fullName: 'Quản Trị Viên Hệ Thống',
    phone: '0901234567',
    address: 'Trụ sở Store Anh, Tầng 8 Tòa nhà Công Nghệ, Cầu Giấy, Hà Nội',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'usr-cust-01',
    email: 'khachhang@gmail.com',
    username: 'user1',
    passwordHash: '123456',
    fullName: 'Nguyễn Văn An',
    phone: '0912345678',
    address: 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
    role: 'customer',
    status: 'active',
    createdAt: '2026-02-15T10:30:00Z'
  },
  {
    id: 'usr-cust-02',
    email: 'tranbinh@gmail.com',
    username: 'tranbinh',
    passwordHash: '123456',
    fullName: 'Trần Thanh Bình',
    phone: '0987654321',
    address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    role: 'customer',
    status: 'active',
    createdAt: '2026-03-01T14:15:00Z'
  }
];

const INITIAL_ORDERS = [
  {
    id: 'ORD-8821',
    userId: 'usr-cust-01',
    customerName: 'Nguyễn Văn An',
    customerEmail: 'khachhang@gmail.com',
    customerPhone: '0912345678',
    shippingAddress: 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
    orderNote: 'Giao giờ hành chính, gọi trước 15 phút giúp mình.',
    paymentMethod: 'COD', // COD or VNPAY
    paymentStatus: 'paid', // pending or paid
    orderStatus: 'da_giao', // cho_xac_nhan, dang_giao, da_giao, da_huy
    items: [
      {
        productId: 'prod-02',
        name: 'Apple MacBook Air 15 inch M2 2023 (16GB RAM / 512GB SSD / Midnight)',
        price: 35490000,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
        subtotal: 35490000
      },
      {
        productId: 'prod-14',
        name: 'Chuột Gaming Không Dây Logitech G502 X PLUS Wireless LIGHTSPEED RGB Hero 25K',
        price: 2990000,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
        subtotal: 2990000
      }
    ],
    subtotal: 38480000,
    shippingFee: 0,
    total: 38480000,
    createdAt: '2026-10-20T09:15:00Z',
    deliveredAt: '2026-10-22T14:30:00Z'
  },
  {
    id: 'ORD-8822',
    userId: 'usr-cust-01',
    customerName: 'Nguyễn Văn An',
    customerEmail: 'khachhang@gmail.com',
    customerPhone: '0912345678',
    shippingAddress: 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
    orderNote: 'Đóng gói bọc bóng xốp cẩn thận.',
    paymentMethod: 'VNPAY',
    paymentStatus: 'paid',
    orderStatus: 'dang_giao',
    items: [
      {
        productId: 'prod-09',
        name: 'Màn Hình Gaming LG UltraGear 27GR75Q-B 27 inch 2K QHD IPS 165Hz 1ms sRGB 99%',
        price: 5790000,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
        subtotal: 5790000
      }
    ],
    subtotal: 5790000,
    shippingFee: 0,
    total: 5790000,
    transactionNo: 'VNP14299831',
    createdAt: '2026-10-25T11:00:00Z'
  },
  {
    id: 'ORD-8823',
    userId: 'usr-cust-02',
    customerName: 'Trần Thanh Bình',
    customerEmail: 'tranbinh@gmail.com',
    customerPhone: '0987654321',
    shippingAddress: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    orderNote: 'Xuất hóa đơn công ty nếu có.',
    paymentMethod: 'COD',
    paymentStatus: 'pending',
    orderStatus: 'cho_xac_nhan',
    items: [
      {
        productId: 'prod-04',
        name: 'PC Gaming Store Anh Ultra i7 14700F / RTX 4070 Super 12GB / 32GB RAM DDR5 / 1TB NVMe / Tản Nước AIO 360',
        price: 38890000,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80',
        subtotal: 38890000
      }
    ],
    subtotal: 38890000,
    shippingFee: 0,
    total: 38890000,
    createdAt: '2026-10-26T08:30:00Z'
  }
];

// Attach data seeds to window for rock-solid availability across the frontend
if (typeof window !== 'undefined') {
  window.DATA_CATEGORIES = INITIAL_CATEGORIES;
  window.INITIAL_CATEGORIES = INITIAL_CATEGORIES;
  window.DATA_PRODUCTS = INITIAL_PRODUCTS;
  window.INITIAL_PRODUCTS = INITIAL_PRODUCTS;
  window.DATA_USERS = INITIAL_USERS;
  window.INITIAL_USERS = INITIAL_USERS;
  window.DATA_ORDERS = INITIAL_ORDERS;
  window.INITIAL_ORDERS = INITIAL_ORDERS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INITIAL_CATEGORIES,
    INITIAL_PRODUCTS,
    INITIAL_USERS,
    INITIAL_ORDERS
  };
}
