import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

export interface Post {
  id: number;
  title: string;
  content: string | null;
  author: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PostsService {
  // ---- MOCK DATA (in-memory) ----
  private posts: Post[] = [
    {
      id: 1,
      title: 'Xin chào NestJS',
      content: 'Bài viết đầu tiên được phục vụ từ mock data trong PostsService.',
      author: 'Nguyễn Văn A',
      published: true,
      createdAt: new Date('2026-07-01T09:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-07-01T09:00:00.000Z').toISOString(),
    },
    {
      id: 2,
      title: 'Kết nối React với Axios',
      content: 'Frontend gọi API /api/posts bằng axios để render danh sách.',
      author: 'Trần Thị B',
      published: true,
      createdAt: new Date('2026-07-05T10:30:00.000Z').toISOString(),
      updatedAt: new Date('2026-07-05T10:30:00.000Z').toISOString(),
    },
    {
      id: 3,
      title: 'Bản nháp chưa xuất bản',
      content: null,
      author: 'Lê Văn C',
      published: false,
      createdAt: new Date('2026-07-10T14:15:00.000Z').toISOString(),
      updatedAt: new Date('2026-07-10T14:15:00.000Z').toISOString(),
    },
  ];
  private nextId = 4;

  findAll(): Post[] {
    return [...this.posts].sort((a, b) => b.id - a.id);
  }

  findOne(id: number): Post {
    const post = this.posts.find((p) => p.id === id);
    if (!post) {
      throw new NotFoundException(`Post #${id} không tồn tại`);
    }
    return post;
  }

  create(dto: CreatePostDto): Post {
    const now = new Date().toISOString();
    const post: Post = {
      id: this.nextId++,
      title: dto.title,
      content: dto.content ?? null,
      author: dto.author?.trim() || 'Ẩn danh',
      published: dto.published ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.posts.push(post);
    return post;
  }

  update(id: number, dto: UpdatePostDto): Post {
    const post = this.findOne(id);
    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.author !== undefined) post.author = dto.author.trim() || 'Ẩn danh';
    if (dto.published !== undefined) post.published = dto.published;
    post.updatedAt = new Date().toISOString();
    return post;
  }

  remove(id: number): { id: number; deleted: true } {
    const index = this.posts.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Post #${id} không tồn tại`);
    }
    this.posts.splice(index, 1);
    return { id, deleted: true };
  }
}
