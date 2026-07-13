import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cho phép frontend (Vite dev server) gọi API
  app.enableCors({
    origin: ['http://localhost:5173'],
  });

  // Tất cả route có tiền tố /api
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
