export type AnimalComment = {
  id: string
  name: string
  message: string
  createdAt: string
}

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

export type AdoptionRequest = {
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

type ApiResponse<T> = {
  data: T
  message?: string
  mailSent?: boolean
}

async function request<T>(
  action: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`/api/index.php?action=${encodeURIComponent(action)}`, {
    credentials: 'same-origin',
    ...options,
  })
  let result: ApiResponse<T>
  try {
    result = (await response.json()) as ApiResponse<T>
  } catch {
    throw new Error(
      'A API retornou uma resposta inválida. Verifique se o servidor PHP está em execução.',
    )
  }
  if (!response.ok) {
    throw new Error(result.message || 'Não foi possível concluir a solicitação.')
  }
  return result
}

export async function loadAnimals() {
  return (await request<Animal[]>('animals')).data
}

export async function loadAdminData() {
  return (await request<{ authenticated: boolean }>('admin-state')).data
}

async function getCsrfToken() {
  return (await request<{ token: string }>('csrf')).data.token
}

export async function loginAdmin(email: string, password: string) {
  const csrfToken = await getCsrfToken()
  return request<{ authenticated: boolean }>('login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ email, password }),
  })
}

export async function logoutAdmin() {
  return request<{ authenticated: boolean }>('logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': await getCsrfToken() },
  })
}

export async function saveAnimal(
  animal: Omit<Animal, 'likes' | 'comments' | 'shares'> & { imageFile?: File },
) {
  const form = new FormData()
  form.set('id', animal.id)
  form.set('name', animal.name)
  form.set('age', animal.age)
  form.set('physicalTraits', animal.physicalTraits)
  form.set('temperament', animal.temperament)
  form.set('imageAlt', animal.imageAlt)
  form.set('image', animal.image)
  if (animal.imageFile) form.set('imageFile', animal.imageFile)
  form.set('csrfToken', await getCsrfToken())

  return request<Animal>('save-animal', { method: 'POST', body: form })
}

export async function adminAction(
  action: 'delete-animal' | 'delete-comment' | 'clear-interactions' | 'update-adoption',
  values: Record<string, string>,
) {
  return request<Animal | AdoptionRequest>(action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': await getCsrfToken(),
    },
    body: JSON.stringify(values),
  })
}

export async function loadAdoptions() {
  return (await request<AdoptionRequest[]>('adoptions')).data
}

export async function submitInteraction(
  action: 'like' | 'comment' | 'share',
  values: Record<string, string>,
) {
  return request<Animal>(action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': await getCsrfToken(),
    },
    body: JSON.stringify(values),
  })
}

export async function submitAdoption(values: {
  animalId: string
  name: string
  age: string
  city: string
  neighborhood: string
  email: string
  phone: string
}) {
  const csrfToken = await getCsrfToken()
  const result = await request<{ id: string }>('adoption', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(values),
  })
  return result
}
