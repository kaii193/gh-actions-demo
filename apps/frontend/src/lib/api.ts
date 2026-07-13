import axios from 'axios'

export interface Post {
  id: number
  title: string
  content: string | null
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface PostInput {
  title: string
  content?: string
  published?: boolean
}

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
})

export const PostsApi = {
  list: () => api.get<Post[]>('/posts').then((r) => r.data),
  detail: (id: number) => api.get<Post>(`/posts/${id}`).then((r) => r.data),
  create: (data: PostInput) => api.post<Post>('/posts', data).then((r) => r.data),
  update: (id: number, data: PostInput) =>
    api.patch<Post>(`/posts/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/posts/${id}`).then((r) => r.data),
}

export default api
