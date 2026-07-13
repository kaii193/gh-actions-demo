import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
export declare class PostsController {
    private readonly postsService;
    constructor(postsService: PostsService);
    create(dto: CreatePostDto): import("./posts.service").Post;
    findAll(): import("./posts.service").Post[];
    findOne(id: number): import("./posts.service").Post;
    update(id: number, dto: UpdatePostDto): import("./posts.service").Post;
    remove(id: number): {
        id: number;
        deleted: true;
    };
}
