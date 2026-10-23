import mongoose from "mongoose"
import { pool } from "../config/db.js"
import Notification from "../models/Notification.js"

export async function queueNotification(client, userId, title, detail) {
  return client.query(
    "INSERT INTO notification_outbox(user_id,title,detail) VALUES($1,$2,$3) RETURNING id",
    [userId, title, detail],
  )
}

export async function flushNotificationOutbox(limit = 100) {
  if (!pool || mongoose.connection.readyState !== 1) return { delivered: 0 }
  const { rows } = await pool.query(
    `SELECT id,user_id,title,detail,created_at FROM notification_outbox
     WHERE delivered_at IS NULL ORDER BY created_at LIMIT $1`,
    [limit],
  )
  let delivered = 0
  for (const row of rows) {
    await Notification.updateOne(
      { sourceId: row.id },
      { $setOnInsert: { sourceId: row.id, userId: row.user_id, title: row.title, detail: row.detail, read: false, createdAt: row.created_at } },
      { upsert: true },
    )
    await pool.query("UPDATE notification_outbox SET delivered_at=now() WHERE id=$1 AND delivered_at IS NULL", [row.id])
    delivered += 1
  }
  return { delivered }
}
