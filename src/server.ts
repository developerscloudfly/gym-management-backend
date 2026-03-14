import { connectDB } from './config/db';
import { env } from './config/env';
import app from './app';

const startServer = async (): Promise<void> => {
  await connectDB();

  const port = Number(env.PORT);

  app.listen(port, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${port}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
