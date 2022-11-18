import express from 'express';
import router from './routes';

const app = express();
const port = 3001;

app.use(express.json());
app.use(router);

app.listen(port, () => {
  console.log(`🚀 Server started on http://localhost:${port}`);
});
