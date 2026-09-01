import "dotenv/config";
import { createApp } from "@/server/app";

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
