/*
*  Credit By Fik Projects
*  rename aja asal pke credit gw :v
*
*/

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const https = require('https')
const path = require('path')

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

const agent = new https.Agent({ rejectUnauthorized: false })

let isPanelReady = false
async function checkPanel() {
  try {
    const res = await fetch(`${process.env.domainPanel}/api/application/users`, {
      agent, headers: { Accept: 'application/json', Authorization: `Bearer ${process.env.apiKey}` }
    })
    isPanelReady = res.status === 200
  } catch { isPanelReady = false }
}
checkPanel()

const products = {
  "1gb": { price: 1000, name: "1GB Panel", ram: 1000, disk: 1000, cpu: 50 },
  "2gb": { price: 2000, name: "2GB Panel", ram: 2000, disk: 2000, cpu: 75 },
  "3gb": { price: 3000, name: "3GB Panel", ram: 3000, disk: 3000, cpu: 100 },
  "4gb": { price: 4000, name: "4GB Panel", ram: 4000, disk: 4000, cpu: 125 },
  "5gb": { price: 5000, name: "5GB Panel", ram: 5000, disk: 5000, cpu: 150 },
  "unli": { price: 10000, name: "Unlimited Panel", ram: 0, disk: 0, cpu: 0 },
  "admin": { price: 15000, name: "Admin Panel", ram: 0, disk: 0, cpu: 0 }
}

const db = new Map()

async function sendTelegram(type, d) {
  let msg = ""
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  
  if (type === 'PENDING') msg = `<b>⏳ PENDING</b>\nID: <code>${d.orderId}</code>\nUser: ${d.username}\nItem: ${d.productName}\nRp ${d.amount.toLocaleString()}\n${time}`
  if (type === 'SUCCESS') msg = `<b>✅ SUCCESS</b>\nID: <code>${d.orderId}</code>\nUser: <code>${d.username}</code>\nEmail: ${d.email}\n${time}`
  if (type === 'FAILED') msg = `<b>⚠️ FAILED</b>\nID: <code>${d.orderId}</code>\nReason: ${d.reason}`
  if (type === 'CANCELED') msg = `<b>❌ CANCELED</b>\nID: <code>${d.orderId}</code>\nUser: ${d.username}`

  try {
    await fetch(`https://api.telegram.org/bot${process.env.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.telegramChatId, text: msg, parse_mode: 'HTML' })
    })
  } catch {}
}

async function getEgg() {
  try {
    const res = await fetch(`${process.env.domainPanel}/api/application/nests/${process.env.nestId}/eggs/${process.env.eggId}?include=variables`, {
      agent, headers: { Accept: 'application/json', Authorization: `Bearer ${process.env.apiKey}` }
    })
    const json = await res.json()
    const env = {}
    json.attributes.relationships.variables.data.forEach(v => {
      env[v.attributes.env_variable] = v.attributes.default_value
    })
    return { startup: json.attributes.startup, image: json.attributes.docker_image, env }
  } catch {
    return { startup: "npm start", image: "ghcr.io/parkervcp/yolks:nodejs_20", env: { INST: "npm", CMD_RUN: "npm start" } }
  }
}

async function createPanel(username, key, isReseller) {
  const email = `${username}@gmail.com`
  const password = username + "001"
  const plan = products[key]

  try {
    const userPayload = { email, username, first_name: username, last_name: "User", root_admin: isReseller, language: "en", password }
    const userRes = await fetch(`${process.env.domainPanel}/api/application/users`, {
      method: 'POST', agent,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.apiKey}` },
      body: JSON.stringify(userPayload)
    })
    const userData = await userRes.json()
    
    if (userData.errors) {
      if (userData.errors[0].detail.toLowerCase().includes("taken")) return { success: false, code: 'DUPLICATE', msg: 'Username taken' }
      return { success: false, msg: userData.errors[0].detail }
    }

    if (isReseller) return { success: true, data: { email, password, url: process.env.domainPanel, type: 'Reseller' } }

    const egg = await getEgg()
    const serverPayload = {
      name: username, user: userData.attributes.id, egg: parseInt(process.env.eggId),
      docker_image: egg.image, startup: egg.startup, environment: egg.env,
      limits: { memory: plan.ram, swap: 0, disk: plan.disk, io: 500, cpu: plan.cpu },
      feature_limits: { databases: 2, backups: 1, allocations: 1 },
      deploy: { locations: [parseInt(process.env.locId)], dedicated_ip: false, port_range: [] }
    }

    const serverRes = await fetch(`${process.env.domainPanel}/api/application/servers`, {
      method: 'POST', agent,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.apiKey}` },
      body: JSON.stringify(serverPayload)
    })
    const serverData = await serverRes.json()
    if (serverData.errors) return { success: false, msg: serverData.errors[0].detail }

    return { success: true, data: { email, password, url: process.env.domainPanel, type: 'Server' } }
  } catch (e) { return { success: false, msg: e.message } }
}

async function processTx(id) {
  const tx = db.get(id)
  if (!tx || tx.status === 'completed') return

  const result = await createPanel(tx.username, tx.productKey, tx.productKey === 'admin')
  
  if (result.success) {
    tx.status = 'completed'
    tx.credential = result.data
    db.set(id, tx)
    sendTelegram('SUCCESS', { ...tx, ...result.data })
  } else {
    tx.status = 'failed'
    tx.error = result.msg
    db.set(id, tx)
    sendTelegram('FAILED', { orderId: id, reason: result.msg })
  }
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/home.html')))
app.get('/payment/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/payment.html')))
app.get('/success/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/success.html')))
app.get('/history', (req, res) => res.sendFile(path.join(__dirname, 'public/history.html')))

app.get('/api/config', (req, res) => res.json({ 
  products, 
  contacts: { wa: process.env.contactWa, ch: process.env.contactCh, tg: process.env.contactTg }
}))

app.post('/api/order', async (req, res) => {
  if (!isPanelReady) return res.status(503).json({ success: false, msg: "Panel maintenance" })
  const { username, productKey } = req.body
  const orderId = `ORD-${Math.floor(Math.random() * 1000000)}`
  const amount = products[productKey].price

  try {
    const payRes = await fetch("https://app.pakasir.com/api/transactioncreate/qris", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: process.env.pakasirSlug, order_id: orderId, amount, api_key: process.env.pakasirApiKey
      })
    })
    const payData = await payRes.json()
    if (!payData.payment) throw new Error("Gateway error")

    const tx = {
      username, productKey, amount, orderId,
      status: 'pending',
      qrRaw: payData.payment.payment_number,
      productName: products[productKey].name,
      createdAt: Date.now()
    }
    db.set(orderId, tx)
    sendTelegram('PENDING', tx)
    res.json({ success: true, orderId })
  } catch (e) { res.status(500).json({ success: false, msg: e.message }) }
})

app.get('/api/check/:id', async (req, res) => {
  const tx = db.get(req.params.id)
  if (!tx) return res.json({ success: false, status: 'expired' })

  if (tx.status === 'pending') {
    try {
      const check = await fetch(`https://app.pakasir.com/api/transactiondetail?project=${process.env.pakasirSlug}&amount=${tx.amount}&order_id=${tx.orderId}&api_key=${process.env.pakasirApiKey}`)
      const json = await check.json()
      const status = json.transaction?.status || json.status || ""
      if (['paid', 'success', 'completed'].includes(status.toLowerCase())) await processTx(tx.orderId)
    } catch {}
  }
  res.json({ success: true, data: db.get(req.params.id) })
})

app.post('/api/cancel', async (req, res) => {
  const { orderId } = req.body
  if (db.has(orderId)) {
    const tx = db.get(orderId)
    tx.status = 'canceled'
    db.set(orderId, tx)
    sendTelegram('CANCELED', tx)
    try {
      await fetch('https://app.pakasir.com/api/transactioncancel', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ project: process.env.pakasirSlug, order_id: orderId, amount: tx.amount, api_key: process.env.pakasirApiKey })
      })
    } catch {}
  }
  res.json({ success: true })
})

app.post('/api/webhook/pakasir', async (req, res) => {
  const { order_id, status } = req.body
  if (db.has(order_id) && ['paid', 'success', 'completed'].includes(status.toLowerCase())) {
    await processTx(order_id)
  }
  res.json({ success: true })
})

app.listen(port, () => console.log(`server running on ports: ${port}`))
