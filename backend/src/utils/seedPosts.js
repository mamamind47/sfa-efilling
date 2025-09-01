const prisma = require('../config/database');

const defaultCategories = [
  {
    name: 'ประกาศสำคัญ',
    description: 'ประกาศสำคัญที่นักศึกษาต้องทราบ',
    color: '#DC2626'
  },
  {
    name: 'ข่าวสาร',
    description: 'ข่าวสารและกิจกรรมต่างๆ ของมหาวิทยาลัย',
    color: '#3B82F6'
  },
  {
    name: 'คำถามพบบ่อย',
    description: 'คำถามที่พบบ่อยและคำตอบ',
    color: '#059669'
  },
  {
    name: 'ประกาศทั่วไป',
    description: 'ประกาศทั่วไปอื่นๆ',
    color: '#6B7280'
  },
  {
    name: 'กิจกรรมอาสาสมัคร',
    description: 'ข้อมูลเกี่ยวกับกิจกรรมอาสาสมัครต่างๆ',
    color: '#10B981'
  },
  {
    name: 'อื่นๆ',
    description: 'เนื้อหาอื่นๆ ที่ไม่อยู่ในหมวดหมู่ข้างต้น',
    color: '#8B5CF6'
  }
];

const seedCategories = async () => {
  console.log('🌱 Seeding post categories...');
  
  try {
    for (const categoryData of defaultCategories) {
      // Check if category already exists
      const existingCategory = await prisma.post_categories.findFirst({
        where: { name: categoryData.name }
      });

      if (!existingCategory) {
        await prisma.post_categories.create({
          data: categoryData
        });
        console.log(`✅ Created category: ${categoryData.name}`);
      } else {
        console.log(`⏭️  Category already exists: ${categoryData.name}`);
      }
    }
    
    console.log('🎉 Post categories seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
};

const seedSamplePosts = async () => {
  console.log('🌱 Seeding sample posts...');
  
  try {
    // Get admin user
    const adminUser = await prisma.users.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.log('⚠️  No admin user found, skipping sample posts');
      return;
    }

    // Get categories
    const categories = await prisma.post_categories.findMany();
    if (categories.length === 0) {
      console.log('⚠️  No categories found, skipping sample posts');
      return;
    }

    const samplePosts = [
      {
        title: '🚨 ประกาศสำคัญ: เปลี่ยนแปลงเกณฑ์การยื่นเอกสารชั่วโมงอาสาสมัคร',
        content: `
          <h2>ประกาศการเปลี่ยนแปลงเกณฑ์การยื่นเอกสาร</h2>
          <p><strong>มีผลตั้งแต่ปีการศึกษา 2567</strong></p>
          
          <h3>📋 เกณฑ์ใหม่:</h3>
          <ul>
            <li>นักศึกษาต้องทำชั่วโมงอาสาสมัครรวม <strong>36 ชั่วโมง</strong> ต่อปีการศึกษา</li>
            <li>สามารถยื่นเอกสารได้ตลอดปีการศึกษา แต่ต้องเสร็จสิ้นก่อนวันสิ้นสุดภาคเรียนที่ 2</li>
            <li>กิจกรรมที่ยื่นต้องเป็นไปตามหมวดหมู่ที่กำหนด</li>
          </ul>
          
          <h3>⚠️ สิ่งสำคัญที่ต้องทราบ:</h3>
          <ul>
            <li>เอกสารที่ยื่นหลังจากวันสิ้นสุดจะไม่ได้รับการพิจารณา</li>
            <li>นักศึกษาที่ไม่ครบชั่วโมงจะไม่สามารถจบการศึกษาได้</li>
            <li>ระบบจะส่งการแจ้งเตือนอัตโนมัติก่อนหมดเขตยื่น</li>
          </ul>
          
          <p><strong>หากมีข้อสงสัย ติดต่อ:</strong> สำนักงานกิจการนักศึกษา โทร. 02-470-8000</p>
        `,
        category_id: categories.find(c => c.name === 'ประกาศสำคัญ')?.category_id || categories[0].category_id,
        author_id: adminUser.user_id,
        is_pinned: true,
        is_published: true
      },
      {
        title: 'ยินดีต้อนรับสู่ระบบข่าวสารและประกาศ SFA E-Filing',
        content: `
          <h2>ยินดีต้อนรับสู่ระบบข่าวสารใหม่!</h2>
          <p>ระบบนี้ถูกพัฒนาขึ้นเพื่อให้การสื่อสารระหว่างมหาวิทยาลัยและนักศึกษามีประสิทธิภาพมากขึ้น</p>
          
          <h3>🎯 ประโยชน์ของระบบใหม่:</h3>
          <ul>
            <li><strong>ได้รับข่าวสารทันที:</strong> อัปเดตข้อมูลสำคัญแบบ Real-time</li>
            <li><strong>ค้นหาง่าย:</strong> หาข้อมูลได้รวดเร็วด้วยระบบค้นหา</li>
            <li><strong>จัดหมวดหมู่:</strong> แยกประเภทข่าวสารให้อ่านง่าย</li>
            <li><strong>ดาวน์โหลดเอกสาร:</strong> ไฟล์แนบสำคัญในที่เดียว</li>
          </ul>
          
          <h3>📱 วิธีการใช้งาน:</h3>
          <ol>
            <li>เข้าสู่ระบบด้วย Username และ Password</li>
            <li>เลือกเมนู "ข่าวสารและประกาศ"</li>
            <li>สามารถกรองตามหมวดหมู่หรือค้นหาได้</li>
            <li>คลิกชื่อเรื่องเพื่ออ่านรายละเอียด</li>
          </ol>
          
          <p>หวังว่าระบบใหม่จะช่วยให้ทุกท่านได้รับข้อมูลข่าวสารได้อย่างสะดวกและรวดเร็วยิ่งขึ้น</p>
        `,
        category_id: categories.find(c => c.name === 'ข่าวสาร')?.category_id || categories[1].category_id,
        author_id: adminUser.user_id,
        is_published: true
      },
      {
        title: 'คำถามพบบ่อย: การยื่นเอกสารชั่วโมงอาสาสมัคร',
        content: `
          <h2>คำถามที่พบบ่อยเกี่ยวกับการยื่นเอกสาร</h2>
          
          <h3>❓ ฉันต้องทำชั่วโมงอาสาสมัครกี่ชั่วโมงต่อปี?</h3>
          <p><strong>ตอบ:</strong> นักศึกษาต้องทำชั่วโมงอาสาสมัครรวม 36 ชั่วโมงต่อปีการศึกษา</p>
          
          <h3>❓ สามารถยื่นเอกสารได้ถึงเมื่อไหร่?</h3>
          <p><strong>ตอบ:</strong> สามารถยื่นได้ตลอดปีการศึกษา แต่ต้องเสร็จสิ้นก่อนวันสิ้นสุดภาคเรียนที่ 2</p>
          
          <h3>❓ ถ้ายื่นเอกสารผิดหรือไม่ครบต้องทำยังไง?</h3>
          <p><strong>ตอบ:</strong> สามารถแก้ไขหรือเพิ่มเติมเอกสารได้ก่อนที่จะได้รับการอนุมัติ หากถูกปฏิเสธแล้วต้องยื่นใหม่</p>
          
          <h3>❓ กิจกรรมประเภทไหนที่สามารถนำมายื่นได้?</h3>
          <p><strong>ตอบ:</strong> กิจกรรมที่นำมายื่นได้ ได้แก่:</p>
          <ul>
            <li>กิจกรรมอาสาสมัครต่างๆ</li>
            <li>การบริจาคโลหิต</li>
            <li>โครงการพัฒนาชุมชน</li>
            <li>กิจกรรมทำนุบำรุงศาสนา</li>
            <li>การออมเงิน กอช.</li>
          </ul>
          
          <h3>❓ ถ้าไม่ครบ 36 ชั่วโมงจะเป็นอย่างไร?</h3>
          <p><strong>ตอบ:</strong> นักศึกษาที่ไม่ครบชั่วโมงจะไม่สามารถจบการศึกษาได้ จำเป็นต้องทำให้ครบตามเกณฑ์</p>
          
          <h3>❓ มีการแจ้งเตือนไหมถ้าใกล้หมดเขต?</h3>
          <p><strong>ตอบ:</strong> มี! ระบบจะส่งการแจ้งเตือนทั้งทางเว็บไซต์และอีเมลก่อนหมดเขตยื่น</p>
        `,
        category_id: categories.find(c => c.name === 'คำถามพบบ่อย')?.category_id || categories[2].category_id,
        author_id: adminUser.user_id,
        is_published: true
      },
      {
        title: 'เปิดรับสมัครกิจกรรมอาสาสมัครช่วยเหลือชุมชน',
        content: `
          <h2>กิจกรรมอาสาสมัครช่วยเหลือชุมชน ประจำเดือนตุลาคม 2567</h2>
          
          <h3>📅 รายละเอียดกิจกรรม</h3>
          <ul>
            <li><strong>วันที่:</strong> 15-16 ตุลาคม 2567</li>
            <li><strong>เวลา:</strong> 08:00 - 16:00 น.</li>
            <li><strong>สถานที่:</strong> วัดใหญ่ชัยมงคล จ.นนทบุรี</li>
            <li><strong>ชั่วโมงที่ได้รับ:</strong> 16 ชั่วโมง</li>
          </ul>
          
          <h3>🎯 กิจกรรมที่จะทำ</h3>
          <ul>
            <li>ทำความสะอาดบริเวณวัดและชุมชนโดยรอบ</li>
            <li>จัดระเบียบของใช้และอุปกรณ์ในวัด</li>
            <li>ช่วยเหลืองานต่างๆ ตามที่วัดต้องการ</li>
            <li>แจกอาหารและน้ำดื่มให้กับผู้สูงอายุในชุมชน</li>
          </ul>
          
          <h3>📋 คุณสมบัติผู้สมัคร</h3>
          <ul>
            <li>เป็นนักศึกษา KMUTT ที่มีสถานะปกติ</li>
            <li>มีความตั้งใจและรับผิดชอบ</li>
            <li>สามารถเข้าร่วมกิจกรรมได้ครบทั้ง 2 วัน</li>
          </ul>
          
          <p><strong>สนใจสมัครติดต่อ:</strong> อาจารย์สมชาย โทร. 02-123-4567</p>
        `,
        category_id: categories.find(c => c.name === 'กิจกรรมอาสาสมัคร')?.category_id || categories[4].category_id,
        author_id: adminUser.user_id,
        is_published: true
      }
    ];

    for (const postData of samplePosts) {
      const existingPost = await prisma.posts.findFirst({
        where: { title: postData.title }
      });

      if (!existingPost) {
        await prisma.posts.create({ data: postData });
        console.log(`✅ Created sample post: ${postData.title}`);
      } else {
        console.log(`⏭️  Sample post already exists: ${postData.title}`);
      }
    }
    
    console.log('🎉 Sample posts seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding sample posts:', error);
    throw error;
  }
};

const seedAll = async () => {
  try {
    await seedCategories();
    await seedSamplePosts();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedAll();
}

module.exports = {
  seedCategories,
  seedSamplePosts,
  seedAll
};