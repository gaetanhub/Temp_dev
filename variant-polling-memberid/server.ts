import app from './app';
import { connectDatabase } from './configs/config.database';
import { startPolling } from './conversations/notification.service';

const PORT = process.env.PORT ?? 3000;

async function main(): Promise<void> {
  await connectDatabase(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/radiolog');
  startPolling();
  app.listen(PORT, () => {
    console.log(`[server] Démarré sur le port ${PORT}`);
  });
}

main().catch(console.error);
