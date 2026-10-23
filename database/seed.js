import "dotenv/config"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import pg from "pg"
import Conversation from "../server/models/Conversation.js"
import Notification from "../server/models/Notification.js"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed PostgreSQL.")
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required to seed MongoDB.")

const seedPassword = process.env.SEED_PASSWORD || "PhongTro@123"
if (seedPassword.length < 12) throw new Error("SEED_PASSWORD must contain at least 12 characters.")
if (process.env.NODE_ENV === "production" && !process.env.SEED_PASSWORD) {
  throw new Error("SEED_PASSWORD is required when seeding a production environment.")
}

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const photos = [
  "https://images.unsplash.com/photo-1655265173214-77882268bc64?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1655265173852-ad4a9b704490?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1737737149038-e6532662659e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1655265173643-f096686bb597?auto=format&fit=crop&w=900&q=80",
]

const users = [
  ["user-renter-01", "Hoàng Trang", "trang.nguyen@example.com", "0901234567", "renter"],
  ["user-renter-02", "Nguyễn An", "nguyenan@example.com", "0901234568", "renter"],
  ["user-landlord-01", "Minh Ngọc", "minhngoc@example.com", "0987654321", "landlord"],
  ["user-admin-01", "Quản trị viên", "admin@phongtroplus.vn", "0909000001", "admin"],
]

const listings = [
  {
    id: "room-thao-dien-studio",
    title: "Studio cửa sổ lớn, đầy đủ nội thất",
    description: "Studio sáng thoáng với cửa sổ lớn, đầy đủ nội thất cơ bản. Hẻm yên tĩnh, gần cửa hàng tiện lợi và tuyến xe buýt.",
    price: 3_500_000,
    deposit: "1 tháng tiền thuê",
    area: 28,
    location: "Thảo Điền, Thủ Đức",
    type: "Căn hộ mini",
    amenities: ["Máy lạnh", "Bãi đỗ xe", "Giờ giấc tự do"],
    image: photos[0],
    latitude: 10.8037,
    longitude: 106.73,
    views: 214,
    contacts: 18,
  },
  {
    id: "room-go-vap-balcony",
    title: "Phòng mới xây, ban công thoáng mát",
    description: "Phòng mới xây, ban công đón gió. Khu vực an ninh, có chỗ để xe trong nhà và giờ giấc tự do.",
    price: 2_800_000,
    deposit: "2.800.000đ",
    area: 25,
    location: "Phường 7, Gò Vấp",
    type: "Phòng trọ",
    amenities: ["Ban công", "Máy lạnh", "Bãi đỗ xe"],
    image: photos[1],
    latitude: 10.8387,
    longitude: 106.6653,
    views: 176,
    contacts: 12,
  },
  {
    id: "room-binh-thanh-mini",
    title: "Căn hộ mini gần Đại học Văn Lang",
    description: "Căn hộ mini gần trường, có máy giặt và khu bếp riêng. Phù hợp sinh viên hoặc người đi làm cần không gian yên tĩnh.",
    price: 4_200_000,
    deposit: "1 tháng tiền thuê",
    area: 32,
    location: "Phường 13, Bình Thạnh",
    type: "Căn hộ mini",
    amenities: ["Máy lạnh", "Máy giặt", "Bãi đỗ xe"],
    image: photos[2],
    latitude: 10.8019,
    longitude: 106.714,
    views: 142,
    contacts: 9,
  },
  {
    id: "room-tan-phu-mezzanine",
    title: "Phòng gác lửng, giờ giấc tự do",
    description: "Phòng gác lửng rộng rãi, giờ giấc tự do. Chủ nhà hỗ trợ xem phòng buổi tối và cuối tuần.",
    price: 2_500_000,
    deposit: "1 tháng tiền thuê",
    area: 22,
    location: "Tân Phú, TP. Hồ Chí Minh",
    type: "Phòng trọ",
    amenities: ["Gác lửng", "Giờ giấc tự do", "Cho nuôi thú cưng"],
    image: photos[3],
    latitude: 10.7901,
    longitude: 106.6286,
    views: 98,
    contacts: 6,
  },
]

async function seedPostgres() {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const passwordHash = await bcrypt.hash(seedPassword, 12)

    for (const [id, name, email, phone, role] of users) {
      await client.query(
        `INSERT INTO users(id,name,email,phone,password_hash,role,status)
         VALUES($1,$2,$3,$4,$5,$6,'active')
         ON CONFLICT(id) DO UPDATE SET
           name=EXCLUDED.name,email=EXCLUDED.email,phone=EXCLUDED.phone,
           password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,status='active',updated_at=now()`,
        [id, name, email, phone, passwordHash, role],
      )
    }

    for (const item of listings) {
      await client.query(
        `INSERT INTO listings(
           id,owner_id,title,description,price_vnd,deposit_text,area_m2,location,
           room_type,contact_phone,amenities,image_url,gallery,latitude,longitude,
           status,views,contacts,created_at,updated_at
         ) VALUES($1,'user-landlord-01',$2,$3,$4,$5,$6,$7,$8,'0987654321',$9,$10,$11,$12,$13,'active',$14,$15,now(),now())
         ON CONFLICT(id) DO UPDATE SET
           owner_id=EXCLUDED.owner_id,title=EXCLUDED.title,description=EXCLUDED.description,
           price_vnd=EXCLUDED.price_vnd,deposit_text=EXCLUDED.deposit_text,area_m2=EXCLUDED.area_m2,
           location=EXCLUDED.location,room_type=EXCLUDED.room_type,contact_phone=EXCLUDED.contact_phone,
           amenities=EXCLUDED.amenities,image_url=EXCLUDED.image_url,gallery=EXCLUDED.gallery,
           latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,status=EXCLUDED.status,
           views=EXCLUDED.views,contacts=EXCLUDED.contacts,updated_at=now()`,
        [
          item.id, item.title, item.description, item.price, item.deposit, item.area,
          item.location, item.type, JSON.stringify(item.amenities), item.image,
          JSON.stringify([item.image]), item.latitude, item.longitude, item.views, item.contacts,
        ],
      )
    }

    await client.query(
      `INSERT INTO transfers(
         id,owner_id,title,description,location,monthly_rent_vnd,transfer_fee_vnd,
         deposit_text,area_m2,room_type,contract_end_date,available_from,amenities,
         image_url,gallery,status,created_at,updated_at
       ) VALUES
       ('transfer-demo-active-01','user-renter-02','Sang lại phòng studio gần Đại học Sư phạm Kỹ thuật',
        'Phòng studio có cửa sổ lớn, máy lạnh, khu bếp riêng và chỗ để xe. Hợp đồng còn thời hạn, chủ nhà thân thiện; mình chuyển công tác nên cần sang lại sớm.',
        'Linh Trung, Thủ Đức, TP. Hồ Chí Minh',4200000,1500000,'Cọc 1 tháng tiền thuê',28,'Căn hộ mini','2027-03-31','2026-11-01',
        '["Máy lạnh","Bếp riêng","Chỗ để xe"]'::jsonb,$1,jsonb_build_array($1::text),'active',now(),now()),
       ('transfer-demo-pending-01','user-renter-01','Sang lại phòng trọ có gác, gần chợ Gò Vấp',
        'Phòng có gác rộng, nhà vệ sinh riêng, giờ giấc tự do. Hợp đồng còn đến cuối năm và có thể nhận phòng trong tháng tới.',
        'Phường 5, Gò Vấp, TP. Hồ Chí Minh',3500000,NULL,'Đã cọc 3.500.000đ',24,'Phòng trọ','2027-01-31','2026-11-05',
        '["Gác lửng","Nhà vệ sinh riêng"]'::jsonb,$2,jsonb_build_array($2::text),'pending',now(),now())
       ON CONFLICT(id) DO UPDATE SET
         owner_id=EXCLUDED.owner_id,title=EXCLUDED.title,description=EXCLUDED.description,
         location=EXCLUDED.location,monthly_rent_vnd=EXCLUDED.monthly_rent_vnd,
         transfer_fee_vnd=EXCLUDED.transfer_fee_vnd,deposit_text=EXCLUDED.deposit_text,
         area_m2=EXCLUDED.area_m2,room_type=EXCLUDED.room_type,
         contract_end_date=EXCLUDED.contract_end_date,available_from=EXCLUDED.available_from,
         amenities=EXCLUDED.amenities,image_url=EXCLUDED.image_url,gallery=EXCLUDED.gallery,
         status=EXCLUDED.status,moderation_note='',updated_at=now()`,
      [photos[1], photos[2]],
    )

    await client.query(
      `INSERT INTO favorites(user_id,listing_id) VALUES('user-renter-01','room-go-vap-balcony')
       ON CONFLICT(user_id,listing_id) DO NOTHING`,
    )
    await client.query(
      `INSERT INTO reviews(id,listing_id,author_id,stars,text)
       VALUES('review-1','room-thao-dien-studio','user-renter-01',5,
         'Phòng đúng như ảnh, cô chủ nhiệt tình. Khu vực yên tĩnh và đi lại thuận tiện.')
       ON CONFLICT(id) DO UPDATE SET stars=EXCLUDED.stars,text=EXCLUDED.text,updated_at=now()`,
    )
    await client.query(
      `INSERT INTO forum_posts(id,author_id,content,image_url,status) VALUES
       ('forum-post-01','user-renter-01','Mọi người cho mình xin review khu trọ gần Đại học Quốc gia với ạ. Mình ưu tiên phòng an ninh, có cửa sổ và giá dưới 3 triệu.',$1,'active'),
       ('forum-post-02','user-landlord-01','Góc nhỏ sau hai tuần tự decor. Mình chia sẻ để mọi người có thêm ý tưởng sắp xếp phòng trọ gọn gàng.',$2,'active')
       ON CONFLICT(id) DO UPDATE SET content=EXCLUDED.content,image_url=EXCLUDED.image_url,status='active',updated_at=now()`,
      [photos[3], photos[2]],
    )
    await client.query(
      `INSERT INTO forum_comments(id,post_id,author_id,content) VALUES
       ('forum-comment-01','forum-post-01','user-landlord-01','Bạn nhớ hỏi kỹ phí điện nước và giờ giấc nhé.'),
       ('forum-comment-02','forum-post-02','user-renter-01','Bạn có thể chia sẻ chỗ mua đồ decor giá ổn không?')
       ON CONFLICT(id) DO UPDATE SET content=EXCLUDED.content,updated_at=now()`,
    )
    await client.query(
      `INSERT INTO forum_reactions(post_id,user_id) VALUES
       ('forum-post-01','user-landlord-01'),('forum-post-02','user-renter-01'),('forum-post-02','user-renter-02')
       ON CONFLICT(post_id,user_id) DO NOTHING`,
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

async function seedMongo() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5_000 })
  await Notification.updateOne(
    { sourceId: "notification-seed-01" },
    { $setOnInsert: { sourceId: "notification-seed-01", userId: "user-renter-01", title: "Chào mừng đến Trọ Ơi", detail: "Dữ liệu này được tải từ MongoDB qua API.", read: false } },
    { upsert: true },
  )
  await Conversation.updateOne(
    { _id: "672000000000000000000001" },
    {
      $set: {
        participants: ["user-landlord-01", "user-renter-01"],
        listingId: "room-thao-dien-studio",
        transferId: "",
        mutedBy: [],
        messages: [
          { senderId: "user-landlord-01", text: "Chào bạn, phòng bạn hỏi hiện vẫn còn nhé.", readBy: ["user-landlord-01"] },
          { senderId: "user-renter-01", text: "Mình có thể hẹn xem phòng chiều mai không ạ?", readBy: ["user-renter-01"] },
        ],
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  )
}

try {
  await seedPostgres()
  await seedMongo()
  console.log("Seeded PostgreSQL and MongoDB successfully.")
  console.log("Development accounts: renter, landlord, and admin use the configured SEED_PASSWORD.")
} finally {
  await Promise.allSettled([pool.end(), mongoose.disconnect()])
}
