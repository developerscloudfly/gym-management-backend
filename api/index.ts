import { connectDB } from '../src/config/db';
import app from '../src/app';

// Connect DB once (Vercel reuses connections across invocations)
connectDB().catch(console.error);

export default app;
