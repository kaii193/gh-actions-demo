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
export declare class PostsService {
    private posts;
    private nextId;
    findAll(): Post[];
    findOne(id: number): Post;
    create(dto: CreatePostDto): Post;
    update(id: number, dto: UpdatePostDto): Post;
    remove(id: number): {
        id: number;
        deleted: true;
    };
}
