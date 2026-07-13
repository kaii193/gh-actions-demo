import { useEffect, useRef } from 'react'

/**
 * Khi tải trang bằng link chia sẻ dạng ?post=<id>, mở chi tiết đúng bài viết đó.
 * Chỉ chạy một lần lúc mount; đọc callback mới nhất qua ref nên dependency rỗng
 * là ổn định & đầy đủ.
 */
export function useOpenSharedPost(openPost: (postId: number) => void): void {
  const openPostRef = useRef(openPost)
  openPostRef.current = openPost

  useEffect(() => {
    const postId = Number(new URLSearchParams(window.location.search).get('post'))
    if (postId) openPostRef.current(postId)
  }, [])
}
