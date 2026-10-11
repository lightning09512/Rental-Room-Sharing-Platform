import "dotenv/config"
import readline from "node:readline"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import bcrypt from "bcryptjs"
import pg from "pg"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.")
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prompt = createInterface({ input: stdin, output: stdout })
function readPasswordHidden() {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Run this command in a terminal, or set BOOTSTRAP_ADMIN_PASSWORD for this one-time setup.")
  return new Promise((resolve) => {
    stdout.write("Initial password (minimum 12 characters): ")
    readline.emitKeypressEvents(stdin)
    stdin.setRawMode(true)
    stdin.resume()
    let value = ""
    const onKeypress = (character, key = {}) => {
      if (key.name === "return" || key.name === "enter") {
        stdin.off("keypress", onKeypress)
        stdin.setRawMode(false)
        stdout.write("\n")
        resolve(value)
      } else if (key.name === "backspace") value = value.slice(0, -1)
      else if (character && !key.ctrl && !key.meta) value += character
    }
    stdin.on("keypress", onKeypress)
  })
}
try {
  const name = (await prompt.question("Admin full name: ")).trim()
  const email = (await prompt.question("Admin email: ")).trim().toLowerCase()
  const phone = (await prompt.question("Admin phone: ")).replace(/\s/g, "")
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || await readPasswordHidden()
  if (name.length < 2 || !email.includes("@") || phone.length < 9 || password.length < 12) throw new Error("Invalid input. Use a valid name/email/phone and a password of at least 12 characters.")
  const hash = await bcrypt.hash(password, 12)
  await pool.query("INSERT INTO users(name,email,phone,password_hash,role,status) VALUES($1,$2,$3,$4,'admin','active')", [name, email, phone, hash])
  console.log("Admin account created.")
} finally {
  prompt.close()
  await pool.end()
}
