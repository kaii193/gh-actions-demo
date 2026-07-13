"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
let PostsService = class PostsService {
    posts = [
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
    nextId = 4;
    findAll() {
        return [...this.posts].sort((a, b) => b.id - a.id);
    }
    findOne(id) {
        const post = this.posts.find((p) => p.id === id);
        if (!post) {
            throw new common_1.NotFoundException(`Post #${id} không tồn tại`);
        }
        return post;
    }
    create(dto) {
        const now = new Date().toISOString();
        const post = {
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
    update(id, dto) {
        const post = this.findOne(id);
        if (dto.title !== undefined)
            post.title = dto.title;
        if (dto.content !== undefined)
            post.content = dto.content;
        if (dto.author !== undefined)
            post.author = dto.author.trim() || 'Ẩn danh';
        if (dto.published !== undefined)
            post.published = dto.published;
        post.updatedAt = new Date().toISOString();
        return post;
    }
    remove(id) {
        const index = this.posts.findIndex((p) => p.id === id);
        if (index === -1) {
            throw new common_1.NotFoundException(`Post #${id} không tồn tại`);
        }
        this.posts.splice(index, 1);
        return { id, deleted: true };
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)()
], PostsService);
//# sourceMappingURL=posts.service.js.map