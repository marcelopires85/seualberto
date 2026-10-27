import bcrypt from 'bcryptjs'
import { del, put } from '@vercel/blob'
import nodemailer from 'nodemailer'
import {
  HttpError,
  MAX_IMAGE_SIZE,
  clearSessionCookie,
  createSessionCookie,
  getAnimal,
  isAdmin,
  json,
  listAdoptions,
  listAnimals,
  newId,
  putAnimal,
  readInput,
  redis,
  requireAdmin,
  requireSameOrigin,
  text,
  withLock,
  type Adoption,
  type Animal,
} from './_lib/core.js'

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

function isSecure(request: Request) {
  return (request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '')) === 'https'
}

async function removeStoredImage(image: string) {
  if (image.includes('.blob.vercel-storage.com/')) {
    await del(image).catch((error) => console.error('Falha ao remover imagem', error))
  }
}

async function sendAdoptionMail(adoption: Adoption) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, MAIL_FROM } = process.env
  if (!SMTP_HOST || !MAIL_TO || !MAIL_FROM) return false
  try {
    const port = Number(SMTP_PORT ?? 587)
    await nodemailer
      .createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
      .sendMail({
        from: MAIL_FROM,
        to: MAIL_TO,
        replyTo: adoption.email,
        subject: `Interesse em adoção: ${adoption.animalName}`,
        text: [
          'Novo formulário de interesse em adoção',
          '',
          `Animal: ${adoption.animalName}`,
          `Nome: ${adoption.name}`,
          `Idade: ${adoption.age}`,
          `Cidade: ${adoption.city}`,
          `Bairro: ${adoption.neighborhood}`,
          `E-mail: ${adoption.email}`,
          `Telefone: ${adoption.phone}`,
        ].join('\n'),
      })
    return true
  } catch (error) {
    console.error('Falha ao enviar e-mail', error)
    return false
  }
}

function detectImageType(bytes: Uint8Array) {
  const hex = Buffer.from(bytes.subarray(0, 12)).toString('hex')
  if (hex.startsWith('ffd8ff')) return 'image/jpeg'
  if (hex.startsWith('89504e470d0a1a0a')) return 'image/png'
  if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return 'image/webp'
  return ''
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function updateAnimal(animalId: string, change: (animal: Animal) => void) {
  return withLock(async () => {
    const animal = await getAnimal(animalId)
    change(animal)
    await putAnimal(animal)
    return animal
  })
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') ?? ''
  const method = request.method

  if (action === 'animals' && method === 'GET') return json({ data: await listAnimals() })
  if (action === 'admin-state' && method === 'GET') return json({ data: { authenticated: isAdmin(request) } })

  if (method !== 'POST') {
    if (action === 'adoptions' && method === 'GET') {
      requireAdmin(request)
      return json({ data: await listAdoptions() })
    }
    throw new HttpError(action ? 'Ação não encontrada.' : 'Método não permitido.', action ? 404 : 405)
  }

  requireSameOrigin(request)

  if (action === 'login') {
    const input = await readInput(request)
    const email = String(input.email ?? '').trim().toLowerCase()
    const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH } = process.env
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
      throw new HttpError('O acesso administrativo ainda não foi configurado no servidor.', 503)
    }
    const valid =
      email === ADMIN_EMAIL.trim().toLowerCase() &&
      (await bcrypt.compare(String(input.password ?? ''), ADMIN_PASSWORD_HASH))
    if (!valid) throw new HttpError('E-mail ou senha incorretos.', 401)
    return json({ data: { authenticated: true } }, 200, {
      'Set-Cookie': createSessionCookie(isSecure(request)),
    })
  }

  if (action === 'logout') {
    return json({ data: { authenticated: false } }, 200, { 'Set-Cookie': clearSessionCookie(isSecure(request)) })
  }

  if (action === 'adoption') {
    const input = await readInput(request)
    const name = text(input, 'name', 120)
    const email = String(input.email ?? '').trim()
    const age = Number(input.age)
    if (!EMAIL_PATTERN.test(email) || !Number.isInteger(age) || age < 1 || age > 120) {
      throw new HttpError('Informe um e-mail válido e uma idade válida.', 422)
    }
    const animal = await getAnimal(text(input, 'animalId', 80))
    const adoption: Adoption = {
      id: newId(),
      animalName: animal.name,
      name,
      age,
      city: text(input, 'city', 100),
      neighborhood: text(input, 'neighborhood', 100),
      email,
      phone: text(input, 'phone', 30),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    await redis().hset('adoptions', { [adoption.id]: adoption })
    await redis().zadd('adoptions:index', { score: Date.now(), member: adoption.id })
    const mailSent = await sendAdoptionMail(adoption)
    return json({
      data: { id: adoption.id },
      mailSent,
      message: mailSent
        ? 'Interesse salvo e enviado ao abrigo.'
        : 'Interesse salvo, mas o e-mail não foi enviado. Avise a equipe do abrigo.',
    })
  }

  if (action === 'like' || action === 'comment' || action === 'share') {
    const input = await readInput(request)
    const animalId = text(input, 'animalId', 80)
    const visitorId = action === 'like' ? text(input, 'visitorId', 80) : ''
    const author = action === 'comment' ? text(input, 'name', 80) : ''
    const message = action === 'comment' ? text(input, 'message', 1000) : ''
    const animal = await updateAnimal(animalId, (current) => {
      if (action === 'like') {
        current.likes = current.likes.includes(visitorId)
          ? current.likes.filter((like) => like !== visitorId)
          : [...current.likes, visitorId]
      } else if (action === 'comment') {
        current.comments.push({ id: newId(), name: author, message, createdAt: new Date().toISOString() })
      } else {
        current.shares += 1
      }
    })
    return json({ data: animal })
  }

  requireAdmin(request)

  if (action === 'save-animal') {
    const input = await readInput(request)
    const name = text(input, 'name', 100)
    const age = text(input, 'age', 50)
    const physicalTraits = text(input, 'physicalTraits', 500)
    const temperament = text(input, 'temperament', 500)
    const imageAlt = text(input, 'imageAlt', 200)
    const animalId = String(input.id ?? '').trim()

    let uploadedImage: string | null = null
    const file = input.imageFile
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_IMAGE_SIZE) throw new HttpError('A imagem deve ter até 4 MB.', 422)
      const type = detectImageType(new Uint8Array(await file.arrayBuffer()))
      const extension = EXTENSIONS[type]
      if (!extension) throw new HttpError('Envie uma imagem JPG, PNG ou WebP válida.', 422)
      const blob = await put(`animals/${newId()}.${extension}`, file, {
        access: 'public',
        contentType: type,
        addRandomSuffix: true,
      })
      uploadedImage = blob.url
    }

    let previousImage: string | null = null
    try {
      const saved = await withLock(async () => {
        const existing = animalId ? await redis().hget<Animal>('animals', animalId) : null
        previousImage = existing?.image ?? null
        const image = uploadedImage ?? String(input.image ?? existing?.image ?? '')
        if (image === '') throw new HttpError('Selecione uma foto para o animal.', 422)
        const animal: Animal = {
          id: existing?.id ?? newId(),
          name,
          age,
          physicalTraits,
          temperament,
          image,
          imageAlt,
          likes: existing?.likes ?? [],
          comments: existing?.comments ?? [],
          shares: existing?.shares ?? 0,
        }
        await putAnimal(animal, existing ? undefined : Date.now())
        return animal
      })
      if (uploadedImage && previousImage) await removeStoredImage(previousImage)
      return json({ data: saved })
    } catch (error) {
      if (uploadedImage) await removeStoredImage(uploadedImage)
      throw error
    }
  }

  const input = await readInput(request)

  if (action === 'delete-animal') {
    const animalId = text(input, 'animalId', 80)
    const animal = await withLock(async () => {
      const current = await getAnimal(animalId)
      await redis().hdel('animals', animalId)
      await redis().zrem('animals:index', animalId)
      return current
    })
    await removeStoredImage(animal.image)
    return json({ data: animal })
  }

  if (action === 'delete-comment') {
    const commentId = text(input, 'commentId', 80)
    const animal = await updateAnimal(text(input, 'animalId', 80), (current) => {
      current.comments = current.comments.filter((comment) => comment.id !== commentId)
    })
    return json({ data: animal })
  }

  if (action === 'clear-interactions') {
    const animal = await updateAnimal(text(input, 'animalId', 80), (current) => {
      current.likes = []
      current.comments = []
      current.shares = 0
    })
    return json({ data: animal })
  }

  if (action === 'update-adoption') {
    const adoptionId = text(input, 'id', 80)
    const status = String(input.status ?? '')
    if (status !== 'pending' && status !== 'contacted') throw new HttpError('Status inválido.', 422)
    const adoption = await withLock(async () => {
      const current = await redis().hget<Adoption>('adoptions', adoptionId)
      if (!current) throw new HttpError('Pedido de adoção não encontrado.', 404)
      current.status = status
      await redis().hset('adoptions', { [adoptionId]: current })
      return current
    })
    return json({ data: adoption })
  }

  throw new HttpError('Ação não encontrada.', 404)
}

async function safeHandle(request: Request) {
  try {
    return await handle(request)
  } catch (error) {
    if (error instanceof HttpError) return json({ message: error.message, data: null }, error.status)
    console.error('Seu Alberto API:', error)
    return json({ message: 'Erro interno ao processar a solicitação.', data: null }, 500)
  }
}

export const GET = safeHandle
export const POST = safeHandle
