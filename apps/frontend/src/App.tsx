import { useEffect, useState } from 'react'
import { PostsApi, type Post, type PostInput } from './lib/api'

const emptyForm: PostInput = { title: '', content: '', author: '', published: false }

// Sinh initials từ tên tác giả cho avatar
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'

// Bảng màu avatar ổn định theo tên
const avatarColors = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-fuchsia-500',
]
const avatarColor = (name: string) => {
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return avatarColors[sum % avatarColors.length]
}

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<PostInput>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<Post | null>(null)
  const [sharedId, setSharedId] = useState<number | null>(null)

  // ---- READ: load list ----
  const loadPosts = async () => {
    setLoading(true)
    setError(null)
    try {
      setPosts(await PostsApi.list())
    } catch {
      setError('Không tải được danh sách. Backend đã chạy ở http://localhost:3000 chưa?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  // ---- CREATE / UPDATE ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (editingId === null) {
        await PostsApi.create(form)
      } else {
        await PostsApi.update(editingId, form)
      }
      resetForm()
      await loadPosts()
    } catch {
      setError('Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (post: Post) => {
    setEditingId(post.id)
    setForm({
      title: post.title,
      content: post.content ?? '',
      author: post.author ?? '',
      published: post.published,
    })
    setDetail(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  // ---- DELETE ----
  const handleDelete = async (id: number) => {
    if (!confirm(`Xoá post #${id}?`)) return
    try {
      await PostsApi.remove(id)
      if (detail?.id === id) setDetail(null)
      if (editingId === id) resetForm()
      await loadPosts()
    } catch {
      setError('Xoá thất bại.')
    }
  }

  // ---- GET DETAIL ----
  const showDetail = async (id: number) => {
    try {
      setDetail(await PostsApi.detail(id))
    } catch {
      setError('Không tải được chi tiết.')
    }
  }

  // ---- SHARE ----
  const buildShareUrl = (id: number) =>
    `${window.location.origin}${window.location.pathname}?post=${id}`

  const handleShare = async (post: Post) => {
    const url = buildShareUrl(post.id)
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: post.content ?? post.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setSharedId(post.id)
        setTimeout(() => setSharedId((current) => (current === post.id ? null : current)), 2000)
      }
    } catch {
      // Người dùng huỷ hộp chia sẻ hoặc clipboard bị chặn — bỏ qua
    }
  }

  // Mở chi tiết theo link chia sẻ ?post=<id> khi tải trang
  useEffect(() => {
    const sharedPostId = Number(new URLSearchParams(window.location.search).get('post'))
    if (sharedPostId) showDetail(sharedPostId)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">📝 Quản lý Posts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            React + Vite + Tailwind ↔ NestJS API (axios)
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
          {/* FORM: create / edit */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold">
              {editingId === null ? 'Tạo post mới' : `Sửa post #${editingId}`}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Tiêu đề</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Nhập tiêu đề..."
                  className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nội dung</label>
                <textarea
                  value={form.content ?? ''}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Nội dung bài viết..."
                  rows={4}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tác giả</label>
                <input
                  value={form.author ?? ''}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  placeholder="Tên tác giả (để trống = Ẩn danh)"
                  className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.published ?? false}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Xuất bản
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : editingId === null ? 'Tạo mới' : 'Cập nhật'}
                </button>
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Huỷ
                  </button>
                )}
              </div>
            </form>

            {/* DETAIL */}
            {detail && (
              <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">Chi tiết #{detail.id}</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleShare(detail)}
                      className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                    >
                      {sharedId === detail.id ? '✓ Đã copy link' : '🔗 Chia sẻ'}
                    </button>
                    <button
                      onClick={() => setDetail(null)}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      đóng
                    </button>
                  </div>
                </div>
                <p className="text-base font-medium">{detail.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarColor(
                      detail.author,
                    )}`}
                  >
                    {initials(detail.author)}
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {detail.author}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                  {detail.content ?? <em className="text-slate-400">(không có nội dung)</em>}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {detail.published ? '✅ Đã xuất bản' : '📄 Bản nháp'} · tạo lúc{' '}
                  {new Date(detail.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            )}
          </section>

          {/* LIST */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Danh sách ({posts.length})</h2>
              <button
                onClick={loadPosts}
                className="text-sm text-sky-600 hover:underline dark:text-sky-400"
              >
                ↻ Tải lại
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Đang tải...</p>
            ) : posts.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có post nào.</p>
            ) : (
              <ul className="space-y-3">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-400">#{post.id}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          post.published
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <h3 className="mt-1.5 line-clamp-1 text-base font-semibold tracking-tight transition group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                      {post.content ?? '(không có nội dung)'}
                    </p>

                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(
                          post.author,
                        )}`}
                      >
                        {initials(post.author)}
                      </span>
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {post.author}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => showDetail(post.id)}
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Xem
                      </button>
                      <button
                        onClick={() => handleShare(post)}
                        className="rounded-md border border-sky-300 px-3 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950/40"
                      >
                        {sharedId === post.id ? '✓ Đã copy link' : '🔗 Chia sẻ'}
                      </button>
                      <button
                        onClick={() => startEdit(post)}
                        className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Xoá
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default App
