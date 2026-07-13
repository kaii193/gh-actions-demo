import type { Post } from '../../lib/api'
import { useSharePost } from './useSharePost'

interface ShareButtonProps {
  post: Post
  className?: string
}

/**
 * Nút chia sẻ tái sử dụng (card + chi tiết). Presentational: nhận post + style,
 * logic chia sẻ nằm trong useSharePost.
 */
export function ShareButton({ post, className }: ShareButtonProps) {
  const { copied, share } = useSharePost()
  const handleClick = () => share(post)

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Chia sẻ bài viết: ${post.title}`}
      className={className}
    >
      {copied ? '✓ Đã copy link' : '🔗 Chia sẻ'}
    </button>
  )
}
