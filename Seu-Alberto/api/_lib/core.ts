import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { Redis } from '@upstash/redis'

export const MAX_IMAGE_SIZE = 4 * 1024 * 1024
const SESSION_TTL_SECONDS = 60 * 60 * 8
const COOKIE_NAME = 'sa_session'

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export type AnimalComment = { id: string; name: string; message: string; createdAt: string }
export type Animal = {
  id: string
  name: string
  age: string
  physicalTraits: string
  temperament: string
  image: string
  imageAlt: string
  likes: string[]
  comments: AnimalComment[]
  shares: number
}
export type Adoption = {
  id: string
  animalName: string
  name: string
  age: number
  city: string
  neighborhood: string
  email: string
  phone: string
  status: 'pending' | 'contacted'
  createdAt: string
}

let redisClient: Redis | undefined
export function redis(): Redis {
  if (!redisClient) {
    const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) throw new Error('Credenciais do Upstash Redis (KV) não configuradas.')
    redisClient = new Redis({ url, token })
  }
  return redisClient
}

export function json(payload: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

export function newId() {
  return randomBytes(16).toString('hex')
}

export function text(input: Record<string, unknown>, key: string, maxLength: number) {
  const value = String(input[key] ?? '').trim()
  if (value === '' || [...value].length > maxLength) {
    throw new HttpError(`O campo ${key} é obrigatório e deve ter até ${maxLength} caracteres.`, 422)
  }
  return value
}

export async function readInput(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') ?? ''
  try {
    if (type.includes('application/json')) {
      const body: unknown = await request.json()
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        return body as Record<string, unknown>
      }
    } else if (type.includes('multipart/form-data')) {
      return Object.fromEntries(await request.formData())
    }
  } catch {
    // cai no erro padrão abaixo
  }
  throw new HttpError('O corpo da solicitação é inválido.', 400)
}

// Sessão sem estado: cookie assinado com HMAC, pois funções serverless não guardam sessão em disco.
function sign(value: string) {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new HttpError('O acesso administrativo ainda não foi configurado no servidor.', 503)
  }
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function cookie(value: string, maxAge: number, secure: boolean) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

export function createSessionCookie(secure: boolean) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString('base64url')
  return cookie(`${payload}.${sign(payload)}`, SESSION_TTL_SECONDS, secure)
}

export function clearSessionCookie(secure: boolean) {
  return cookie('', 0, secure)
}

export function isAdmin(request: Request) {
  const raw = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1)
  if (!raw) return false
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return false
  try {
    const expected = Buffer.from(sign(payload))
    const received = Buffer.from(signature)
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp: number }
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

export function requireAdmin(request: Request) {
  if (!isAdmin(request)) throw new HttpError('Faça login para continuar.', 401)
}

// Proteção CSRF: cookie SameSite=Strict + cabeçalho personalizado (exige preflight CORS) + checagem de Origin.
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const sameOrigin = origin === null || (host !== null && new URL(origin).host === host)
  if (request.headers.get('x-requested-with') !== 'fetch' || !sameOrigin) {
    throw new HttpError('Solicitação não autorizada.', 403)
  }
}

export async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const token = newId()
  let acquired = false
  for (let attempt = 0; attempt < 50 && !acquired; attempt++) {
    acquired = (await redis().set('lock', token, { nx: true, ex: 10 })) === 'OK'
    if (!acquired) await new Promise((resolve) => setTimeout(resolve, 100))
  }
  if (!acquired) throw new Error('Não foi possível bloquear o armazenamento.')
  try {
    return await operation()
  } finally {
    if ((await redis().get('lock')) === token) await redis().del('lock')
  }
}

function defaultAnimals(): Animal[] {
  return Array.from({ length: 6 }, (_, index) => ({
    id: `demo-${index + 1}`,
    name: `Pet ${index + 1}`,
    age: 'Idade a confirmar',
    physicalTraits: 'Porte e características físicas em atualização.',
    temperament: 'Estamos conhecendo sua personalidade.',
    image: `demo:dog${index + 1}`,
    imageAlt: `Cão disponível para adoção, perfil demonstrativo ${index + 1}`,
    likes: [],
    comments: [],
    shares: 0,
  }))
}

export async function putAnimal(animal: Animal, score?: number) {
  await redis().hset('animals', { [animal.id]: animal })
  if (score !== undefined) await redis().zadd('animals:index', { score, member: animal.id })
}

async function ensureSeeded() {
  if (await redis().set('seeded', '1', { nx: true })) {
    const now = Date.now()
    for (const [index, animal] of defaultAnimals().entries()) await putAnimal(animal, now + index)
  }
}

export async function listAnimals(): Promise<Animal[]> {
  await ensureSeeded()
  const ids = await redis().zrange<string[]>('animals:index', 0, -1)
  if (ids.length === 0) return []
  const found = await redis().hmget<Record<string, Animal>>('animals', ...ids)
  return ids.map((animalId) => found?.[animalId]).filter((animal): animal is Animal => Boolean(animal))
}

export async function getAnimal(animalId: string): Promise<Animal> {
  await ensureSeeded()
  const animal = await redis().hget<Animal>('animals', animalId)
  if (!animal) throw new HttpError('Animal não encontrado.', 404)
  return animal
}

export async function listAdoptions(): Promise<Adoption[]> {
  const ids = await redis().zrange<string[]>('adoptions:index', 0, -1)
  if (ids.length === 0) return []
  const found = await redis().hmget<Record<string, Adoption>>('adoptions', ...ids)
  return ids.map((adoptionId) => found?.[adoptionId]).filter((item): item is Adoption => Boolean(item))
}
