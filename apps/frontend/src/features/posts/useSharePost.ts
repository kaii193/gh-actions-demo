import { useCallback, useEffect, useRef, useState } from 'react'
import type { Post } from '../../lib/api'

const COPIED_FEEDBACK_MS = 2000

export const buildShareUrl = (postId: number): string =>
  `${window.location.origin}${window.location.pathname}?post=${postId}`

interface UseSharePostResult {
  copied: boolean
  share: (post: Post) => Promise<void>
}

/**
 * Chia sẻ một bài viết: dùng Web Share API khi có, nếu không thì copy link vào
 * clipboard và báo "đã copy" trong COPIED_FEEDBACK_MS. State là cục bộ nên mỗi
 * nút tự quản lý, không cần nâng lên App hay prop drilling.
 */
export function useSharePost(): UseSharePostResult {
  const [copied, setCopied] = useState(false)
  const copiedTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(copiedTimeout.current), [])

  const share = useCallback(async (post: Post) => {
    const url = buildShareUrl(post.id)
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: post.content ?? post.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      clearTimeout(copiedTimeout.current)
      copiedTimeout.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      // Người dùng huỷ hộp chia sẻ hoặc clipboard bị chặn — không có gì để khôi phục
    }
  }, [])

  return { copied, share }
}
